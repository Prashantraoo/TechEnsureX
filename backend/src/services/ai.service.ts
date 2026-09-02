// ─── TechEnsureX AI Service — Chat + Health Summary ─────
// Document analysis lives in document-analysis.service.ts, claim
// analysis in claim-analysis.service.ts, retrieval in rag.service.ts —
// each with its own task-specific prompt rather than one shared giant
// prompt. This file owns the two chat-shaped features: the AI Chat
// Assistant and the numeric health-report summary.

import {
  streamChatDeltas,
  MODELS,
  TECHENSUREX_SYSTEM_PROMPT,
  type ChatMessage,
} from "./nvidia.js";
import { withBoundedRetry } from "./retry.js";
import { DocumentScan } from "../models/DocumentScan.js";
import { formatAnalysisAsContext, type DocumentAnalysisResult } from "./document-analysis.service.js";
import { retrieveRelevantChunks, formatRetrievedContext } from "./rag.service.js";

// ─── Chat Completion ────────────────────────────────────
// Only the most recent turns are sent as context — a chat that's been
// going for a while doesn't need its entire history replayed to the
// model on every message. The UI still shows the full conversation;
// this only trims what's sent to the API.
const MAX_HISTORY_MESSAGES = 10;

function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  const systemMsgs = messages.filter((m) => m.role === "system");
  const nonSystem = messages.filter((m) => m.role !== "system");
  return [...systemMsgs, ...nonSystem.slice(-MAX_HISTORY_MESSAGES)];
}

// NOTE on NIM_SAFETY_MODEL (nvidia/nemotron-3.5-content-safety): tested
// live against this platform's actual traffic (see checkSafety in
// nvidia.ts) and found NOT fit to gate ordinary chat here. It classifies
// any message naming a specific clinical value — "What is my HbA1c?",
// "What is the patient's blood pressure?" — as unsafe regardless of
// phrasing (first-person, third-person, with or without added context),
// evidently treating any factual medical-value question as
// "specialized medical advice" territory. Since answering exactly these
// questions from a user's own uploaded report is this product's core
// feature, wiring it in as a hard pre-filter would block legitimate use
// on every single health-report follow-up. It is deliberately NOT used
// as a blocking gate. Actual safety behavior (never diagnose or
// prescribe, never claim certainty the document doesn't support, always
// suggest professional review) is enforced at the prompt level instead —
// see TECHENSUREX_SYSTEM_PROMPT in nvidia.ts and the task-specific
// prompts in document-analysis.service.ts / claim-analysis.service.ts —
// which is both more accurate for this domain and doesn't cost an extra
// NIM call on every message.
/**
 * Streams the chat reply via onDelta as chunks arrive (see nvidia.ts's
 * streamChatDeltas). Uses the FAST chat model (see nvidia.ts's MODELS) —
 * ordinary questions never touch the slow reasoning model. Grounds the
 * answer in two optional, best-effort sources when relevant:
 *   - the user's most recently uploaded report (so "what's my HbA1c?"
 *     works as a chat follow-up, not just at upload time)
 *   - retrieved insurance-plan chunks (RAG — see rag.service.ts)
 * Both are fetched in parallel and fail silently: grounding is an
 * enhancement, chat must still work if retrieval has a hiccup.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  userId: string,
  onDelta: (text: string) => void
): Promise<void> {
  const trimmed = trimHistory(messages);
  const lastUserMessage = [...trimmed].reverse().find((m) => m.role === "user")?.content ?? "";

  const [docContext, policyChunks] = await Promise.all([
    getRecentDocumentContext(userId).catch(() => null),
    lastUserMessage ? retrieveRelevantChunks(lastUserMessage).catch(() => []) : Promise.resolve([]),
  ]);

  const finalMessages = withGroundingContext(trimmed, docContext, policyChunks);
  await streamWithBoundedRetry(finalMessages, onDelta);
}

// Always keeps the TechEnsureX persona/base instructions in force — the
// grounding block (when present) is appended to it, never substituted
// for it. Passing only the grounding message as the sole system message
// was an earlier bug here: nvidia.ts only auto-adds the persona prompt
// when a call has NO system message at all, so a grounding-only message
// silently dropped the persona and its "explain concepts using general
// knowledge" instruction — causing the model to over-refuse ordinary
// questions ("what's a deductible?") as if nothing was ever grounded.
function withGroundingContext(
  messages: ChatMessage[],
  docContext: string | null,
  policyChunks: Awaited<ReturnType<typeof retrieveRelevantChunks>>
): ChatMessage[] {
  const parts: string[] = [];
  if (docContext) parts.push(`The user recently uploaded this report:\n${docContext}`);
  if (policyChunks.length) {
    parts.push(
      `Relevant policy information retrieved for this question:\n${formatRetrievedContext(policyChunks)}\n\nWhen you use this, say "According to your policy document..." and name the plan it came from.`
    );
  }

  let systemContent = TECHENSUREX_SYSTEM_PROMPT;
  if (parts.length > 0) {
    systemContent += `\n\n---\nAdditional context for this conversation — use it only if actually relevant to the user's current question. It supplements, but never replaces, your ability to explain general insurance concepts from your own knowledge. If specific information (e.g. a number from the user's own report or policy) isn't in this context, this conversation, or general knowledge, say you don't have that information rather than guessing.\n\n${parts.join("\n\n")}`;
  }

  const priorSystemMsgs = messages.filter((m) => m.role === "system");
  const nonSystem = messages.filter((m) => m.role !== "system");
  return [{ role: "system", content: systemContent }, ...priorSystemMsgs, ...nonSystem];
}

async function getRecentDocumentContext(userId: string): Promise<string | null> {
  const scan = await DocumentScan.findOne({ userId }).sort({ createdAt: -1 }).lean();
  if (!scan?.analysis) return null;
  return formatAnalysisAsContext(scan.analysis as unknown as DocumentAnalysisResult, scan.fileName);
}

// Retries via the shared bounded-retry policy (see retry.ts) — the same
// one document and vision analysis use, rather than a second copy of it
// here. Only the classes worth retrying: a dropped connection or a
// capacity rejection before any content arrived, plus a stream that
// ended completely empty. A plain "timeout" (the model IS responding,
// just slowly) is still never retried — that would just double an
// already-long wait.
//
// Safe by construction: every retryable class above is one where the
// stream produced no content, so onDelta cannot have fired and a retry
// cannot duplicate output already sent to the client. streamChatDeltas
// guarantees this — once it has emitted a delta it returns rather than
// throwing (see its catch), so a throw always means nothing was sent.
async function streamWithBoundedRetry(
  messages: ChatMessage[],
  onDelta: (text: string) => void
): Promise<void> {
  await withBoundedRetry(
    () => streamChatDeltas(messages, { model: MODELS.chat, maxTokens: 700, disableThinking: true }, onDelta),
    "[AI] chat",
    ["network_error", "rate_limited", "empty_response"]
  );
}

// ─── Health Report Summary ──────────────────────────────
const HEALTH_SUMMARY_SYSTEM_PROMPT = `detailed thinking off

You are EnsureAI's health report mode for TechEnsureX. Based on the user's health data, provide:
1. **Overall Assessment** — brief health status summary
2. **Risk Analysis** — explain each risk factor supplied
3. **General Observations** — patterns worth being aware of, clearly framed as general information, not a diagnosis
4. **Insurance Implications** — how this generally relates to coverage needs

Be empathetic, professional, and specific to the numbers given. Do not diagnose conditions or prescribe treatment — recommend a doctor or specialist for anything clinical. Use Indian context for hospitals and treatments where relevant. Keep each section to 2-3 sentences.`;

export async function summarizeHealthReport(reportData: {
  cardiovascularRisk: number;
  diabetesRisk: number;
  wellnessScore: number;
  vitals?: Record<string, string>;
}): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: HEALTH_SUMMARY_SYSTEM_PROMPT },
    {
      role: "user",
      content: `My health report data:
- Cardiovascular Risk: ${reportData.cardiovascularRisk}%
- Diabetes Risk: ${reportData.diabetesRisk}%
- Wellness Score: ${reportData.wellnessScore}/100
${reportData.vitals ? `- Vitals: ${JSON.stringify(reportData.vitals)}` : ""}

Please analyze and provide recommendations.`,
    },
  ];

  // A 4-section summary from a handful of numbers doesn't need the
  // reasoning model — the fast chat model handles this well and quickly.
  let content = "";
  await streamChatDeltas(messages, { model: MODELS.chat, maxTokens: 500, temperature: 0.5, disableThinking: true }, (delta) => {
    content += delta;
  });
  return content;
}
