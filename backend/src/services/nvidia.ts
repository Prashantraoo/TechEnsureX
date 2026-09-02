// ─── TechEnsureX — NVIDIA NIM AI Service ────────────────
// Sole place the NVIDIA-hosted OpenAI-compatible client is constructed.
// Every AI feature (chat, document analysis, health summaries,
// embeddings, safety checks) calls through here so there is exactly one
// client, one place model IDs are resolved, and one error-handling path
// for the whole backend.
//
// Model selection: all IDs below were verified against a live
// `GET /v1/models` call against this account before being wired in —
// see the audit notes in the final report. They're read from env with
// these exact IDs as fallback defaults, so overriding via .env is safe
// as long as you verify the replacement the same way.

import OpenAI from "openai";
import { env } from "../config/env.js";

const NVIDIA_BASE_URL = env.NVIDIA_BASE_URL;

export const MODELS = {
  chat: env.NIM_CHAT_MODEL, // fast, small — ordinary conversation
  reasoning: env.NIM_REASONING_MODEL, // large, slow — genuinely complex analysis only
  vision: env.NIM_VISION_MODEL, // scanned/image-only document fallback
  embed: env.NIM_EMBED_MODEL, // RAG indexing + query embeddings
  safety: env.NIM_SAFETY_MODEL, // lightweight content-safety classifier
} as const;

// The fast chat model measured 1.5-2.5s end-to-end in testing — 30s is
// already a generous multiple of that, so a hang fails fast instead of
// making the user wait minutes. Reasoning-model callers (document
// analysis) pass their own much longer timeoutMs explicitly.
const DEFAULT_TIMEOUT_MS = 30_000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Lazily constructed: importing this module must never throw just because
// the key isn't configured yet (e.g. during a build or an unrelated route).
// The missing-key error instead surfaces the first time it's actually used.
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!env.NVIDIA_API_KEY) {
    throw new AiServiceError(
      "AI service is not configured. Add NVIDIA_API_KEY to backend/.env.",
      "missing_api_key"
    );
  }
  if (!client) {
    client = new OpenAI({
      baseURL: NVIDIA_BASE_URL,
      apiKey: env.NVIDIA_API_KEY,
      // Large reasoning-model calls can legitimately take tens of
      // seconds. The SDK's default auto-retry would silently re-attempt
      // on top of that and turn one slow-but-working call into multiple
      // timeouts stacked back to back — better to make one attempt with
      // an explicit timeout and fail fast/clearly. (ai.service.ts adds
      // its own single bounded retry, but only for genuine transient
      // network failures — never for "the model is just slow".)
      maxRetries: 0,
      timeout: DEFAULT_TIMEOUT_MS,
    });
  }
  return client;
}

export type AiErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "rate_limited"
  | "timeout"
  | "network_error"
  | "empty_response"
  | "malformed_response"
  | "payload_too_large"
  | "upstream_error";

// A user-safe error: `message` is always OK to show in the UI. Whatever
// the NVIDIA API actually said (status codes, upstream error bodies) is
// logged server-side only, in the route handlers that catch this.
export class AiServiceError extends Error {
  code: AiErrorCode;
  constructor(message: string, code: AiErrorCode) {
    super(message);
    this.name = "AiServiceError";
    this.code = code;
  }
}

// TechEnsureX's insurance-assistant persona for ordinary chat. Kept
// deliberately short — this gets sent with every chat request, and a
// shorter prompt means less for the model to process before it can
// start generating. Document analysis, health summaries, and policy
// Q&A each have their own dedicated, task-specific prompt in
// ai.service.ts rather than reusing or extending this one.
export const TECHENSUREX_SYSTEM_PROMPT = `detailed thinking off

You are EnsureAI, the assistant embedded in TechEnsureX, an Indian medical insurance platform.

Explain insurance concepts (deductibles, sum insured, co-pay, cashless vs reimbursement) clearly and briefly. Use only information actually given to you in this conversation — never invent policy numbers, coverage limits, or claim details. If you don't have specifics, say so and suggest what would help (e.g. their policy document or claim ID).

You are not the final authority on any claim — never say one is approved, denied, or paid. You are not a doctor — never diagnose or prescribe; recommend a professional for clinical questions. For anything with real financial, medical, or legal consequences, recommend confirming with a TechEnsureX agent, the insurer, or a qualified professional.

Tone: concise, warm, trustworthy. Use ₹ for amounts and Indian context where relevant.`;

interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /**
   * Suppresses the model's hidden chain-of-thought (`reasoning_content`)
   * for hybrid-reasoning models. Verified experimentally against
   * MODELS.chat (nemotron-3.5-lightning-30b-a3b): the documented "detailed
   * thinking off" system-prompt convention is unreliable for this model
   * on this task, but the request-level `chat_template_kwargs.thinking`
   * flag reliably drops reasoning_content to empty and returns
   * finish_reason "stop" instead of "length". Opt-in per call — only
   * set this where the caller has verified the model/task combination
   * behaves correctly without the reasoning step (see
   * document-analysis.service.ts's fast narrative calls).
   */
  disableThinking?: boolean;
}

/**
 * Low-level chat completion against NVIDIA NIM. Prepends the
 * TechEnsureX system prompt automatically unless the caller already
 * supplied a system message. Defaults to the fast chat model —
 * reasoning-heavy callers must pass `model: MODELS.reasoning` explicitly.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  const hasSystemMessage = messages.some((m) => m.role === "system");
  const finalMessages: ChatMessage[] = hasSystemMessage
    ? messages
    : [{ role: "system", content: TECHENSUREX_SYSTEM_PROMPT }, ...messages];

  let response;
  try {
    response = await getClient().chat.completions.create(
      {
        model: options.model ?? MODELS.chat,
        messages: finalMessages,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 512,
      },
      { timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS }
    );
  } catch (error: any) {
    throw mapNvidiaError(error);
  }

  const content = response.choices?.[0]?.message?.content;
  if (content == null) {
    throw new AiServiceError(
      "The AI service returned an unexpected response. Please try again.",
      "malformed_response"
    );
  }
  if (content.trim() === "") {
    throw new AiServiceError(
      "The AI service returned an empty response. Please try again.",
      "empty_response"
    );
  }
  return content;
}

interface VisionCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Same verified lever as ChatCompletionOptions.disableThinking (see
   *  that doc comment) — MODELS.vision is also a hybrid-reasoning model
   *  ("...-omni-30b-a3b-reasoning") and was measured burning 65-75% of
   *  completion tokens on hidden reasoning_content before any real
   *  answer, making a 2-page scanned PDF take 71-141s. With this set,
   *  reasoning_content measured 0 across repeated trials and the same
   *  call completed in 6-14s with identical extracted values. */
  disableThinking?: boolean;
}

/**
 * Chat completion against the vision-capable model with one or more
 * page images attached (used only for scanned/image-only PDFs — see
 * pdf-render.service.ts and vision-analysis.service.ts). Images are sent
 * as base64 data URLs, the standard OpenAI-compatible multimodal
 * content format. Non-streaming: vision analysis produces one bounded
 * JSON object, same as document analysis, so there's nothing to stream
 * incrementally to.
 */
export async function visionCompletion(
  systemPrompt: string,
  userText: string,
  imagesPng: Buffer[],
  options: VisionCompletionOptions = {}
): Promise<string> {
  const content: Array<Record<string, unknown>> = [{ type: "text", text: userText }];
  for (const image of imagesPng) {
    content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${image.toString("base64")}` } });
  }

  let response;
  try {
    response = await getClient().chat.completions.create(
      {
        model: MODELS.vision,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ] as unknown as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2048,
        ...(options.disableThinking ? { chat_template_kwargs: { thinking: false } } : {}),
      },
      // Multi-page image payloads on the vision model measured well over
      // 90s in testing (2 pages, ~157KB PNG each) with reasoning enabled
      // — this is genuinely how long the model takes, not a hung
      // request, so the ceiling needs real headroom rather than cutting
      // it off early. Callers that pass disableThinking measure 6-14s.
      { timeout: options.timeoutMs ?? 150_000 }
    );
  } catch (error: any) {
    throw mapNvidiaError(error);
  }

  const text = response.choices?.[0]?.message?.content;
  if (text == null) {
    throw new AiServiceError(
      "The AI service returned an unexpected response. Please try again.",
      "malformed_response"
    );
  }
  if (text.trim() === "") {
    throw new AiServiceError(
      "The AI service returned an empty response. Please try again.",
      "empty_response"
    );
  }
  return text;
}

interface StreamedCompletion {
  content: string;
  /** True if we stopped consuming early (soft deadline hit) rather than
   *  the model naturally finishing — callers may be getting a partial
   *  response and should handle that (e.g. repair-on-truncation). */
  softTimedOut: boolean;
}

/**
 * Like chatCompletion, but reads the response as a stream and will stop
 * consuming it once `softTimeoutMs` elapses, returning whatever content
 * arrived so far instead of throwing. Used by document analysis (which
 * defaults to the reasoning model): for a slow model, "some
 * mostly-complete output after 100s" is far more useful than "nothing
 * after 180s" — the caller is expected to be able to make sense of a
 * possibly-truncated result (see ai.service.ts's JSON repair path).
 * `hardTimeoutMs` is a true upper bound in case the stream itself hangs.
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  options: ChatCompletionOptions & { softTimeoutMs?: number; hardTimeoutMs?: number } = {}
): Promise<StreamedCompletion> {
  const hasSystemMessage = messages.some((m) => m.role === "system");
  const finalMessages: ChatMessage[] = hasSystemMessage
    ? messages
    : [{ role: "system", content: TECHENSUREX_SYSTEM_PROMPT }, ...messages];

  const softDeadline = Date.now() + (options.softTimeoutMs ?? 100_000);
  const hardTimeoutMs = options.hardTimeoutMs ?? DEFAULT_TIMEOUT_MS;

  let stream;
  try {
    stream = await getClient().chat.completions.create(
      {
        model: options.model ?? MODELS.chat,
        messages: finalMessages,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 1024,
        stream: true,
        // Top-level (not nested in extra_body/nvext) — the only form
        // that measurably suppressed reasoning_content in testing. Not
        // part of the OpenAI SDK's typed request shape, hence the cast.
        ...(options.disableThinking ? { chat_template_kwargs: { thinking: false } } : {}),
      } as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
      { timeout: hardTimeoutMs }
    );
  } catch (error: any) {
    throw mapNvidiaError(error);
  }

  let content = "";
  let softTimedOut = false;
  try {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) content += delta;
      if (Date.now() > softDeadline) {
        softTimedOut = true;
        break;
      }
    }
  } catch (error: any) {
    // If we already have usable content when the stream itself errors
    // (e.g. connection drop after most of the response arrived), prefer
    // returning that over throwing — same reasoning as the soft-deadline
    // break above.
    if (content.trim() === "") throw mapNvidiaError(error);
    softTimedOut = true;
  }

  if (content.trim() === "") {
    throw new AiServiceError(
      "The AI service returned an empty response. Please try again.",
      "empty_response"
    );
  }
  return { content, softTimedOut };
}

/**
 * Streams a chat completion, invoking `onDelta` with each text chunk as
 * it arrives instead of waiting for the full response. Defaults to the
 * fast chat model, where this mostly just smooths out the ~1-2s wait;
 * it matters far more when a caller passes `model: MODELS.reasoning`.
 * Enforces its own deadline inside the read loop rather than relying
 * solely on the SDK's `timeout` option, which was observed not to cut
 * off an in-progress stream reliably in testing.
 */
export async function streamChatDeltas(
  messages: ChatMessage[],
  options: ChatCompletionOptions,
  onDelta: (text: string) => void
): Promise<void> {
  const hasSystemMessage = messages.some((m) => m.role === "system");
  const finalMessages: ChatMessage[] = hasSystemMessage
    ? messages
    : [{ role: "system", content: TECHENSUREX_SYSTEM_PROMPT }, ...messages];

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  let stream;
  try {
    stream = await getClient().chat.completions.create(
      {
        model: options.model ?? MODELS.chat,
        messages: finalMessages,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 1024,
        stream: true,
        // Same verified lever as chatCompletionStream. MODELS.chat is a
        // hybrid-reasoning model, so without this its chain-of-thought
        // streams straight into the user's chat bubble.
        ...(options.disableThinking ? { chat_template_kwargs: { thinking: false } } : {}),
      } as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
      { timeout: timeoutMs }
    );
  } catch (error: any) {
    throw mapNvidiaError(error);
  }

  let receivedAny = false;
  try {
    for await (const chunk of stream) {
      if (Date.now() > deadline) {
        if (receivedAny) return; // give up on the rest, keep what we have
        throw new AiServiceError("The AI service took too long to respond. Please try again.", "timeout");
      }
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        receivedAny = true;
        onDelta(delta);
      }
    }
  } catch (error: any) {
    // Already streamed something to the client when the connection to
    // NVIDIA dropped — nothing sane to throw at this point (the response
    // may already be flowing to the browser); just stop.
    if (!receivedAny) throw mapNvidiaError(error);
    return;
  }

  if (!receivedAny) {
    throw new AiServiceError(
      "The AI service returned an empty response. Please try again.",
      "empty_response"
    );
  }
}

/**
 * Embeds one or more texts for RAG indexing/retrieval. NVIDIA's embed
 * model requires `input_type`: "passage" when indexing documents,
 * "query" when embedding a search query — passing the wrong one
 * measurably hurts retrieval quality even though both "work".
 */
export async function embed(
  texts: string[],
  inputType: "passage" | "query"
): Promise<number[][]> {
  if (texts.length === 0) return [];
  let response;
  try {
    response = await getClient().embeddings.create(
      {
        model: MODELS.embed,
        input: texts,
        // NVIDIA-specific parameter, not in the base OpenAI type.
        ...({ input_type: inputType } as Record<string, unknown>),
      } as any,
      { timeout: 20_000 }
    );
  } catch (error: any) {
    throw mapNvidiaError(error);
  }
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding as unknown as number[]);
}

export interface SafetyCheckResult {
  safe: boolean;
  raw: string;
}

/**
 * Lightweight content-safety classification (measured ~0.4s in testing —
 * cheap enough to run on every chat message without materially hurting
 * the fast-chat latency budget). Fails OPEN on any error: a broken
 * safety check must never itself become the reason a legitimate user
 * can't get help from an insurance/health platform, so errors are
 * logged and treated as "safe" rather than blocking the request.
 */
export async function checkSafety(text: string): Promise<SafetyCheckResult> {
  try {
    const response = await getClient().chat.completions.create(
      {
        model: MODELS.safety,
        messages: [{ role: "user", content: text }],
        max_tokens: 16,
      },
      { timeout: 5_000 }
    );
    const raw = response.choices?.[0]?.message?.content ?? "";
    const safe = !/unsafe/i.test(raw);
    return { safe, raw };
  } catch (error) {
    console.warn("[AI] Safety check failed (failing open):", describeAiError(error));
    return { safe: true, raw: "check_failed" };
  }
}

// Translates SDK/HTTP-level failures into safe, typed errors. Never
// includes the API key; only status/type info useful for logs.
function mapNvidiaError(error: any): AiServiceError {
  const status = error?.status ?? error?.response?.status;
  const ctorName: string = error?.constructor?.name ?? "";
  const isTimeout =
    error?.name === "AbortError" ||
    error?.code === "ETIMEDOUT" ||
    error?.type === "request_timeout" ||
    ctorName.includes("Timeout");

  if (isTimeout) {
    return new AiServiceError("The AI service took too long to respond. Please try again.", "timeout");
  }
  if (status === 401 || status === 403) {
    return new AiServiceError(
      "AI service authentication failed. Please contact support.",
      "invalid_api_key"
    );
  }
  if (status === 429 || status === 503) {
    return new AiServiceError(
      "The AI service is busy right now. Please try again in a moment.",
      "rate_limited"
    );
  }
  if (status === 413) {
    return new AiServiceError("This request is too large for the AI service to process.", "payload_too_large");
  }
  if (status === 400) {
    return new AiServiceError("The AI service could not process this request.", "upstream_error");
  }
  if (status >= 500 || status === undefined) {
    // undefined status usually means a network-level failure (DNS, connection refused, etc.)
    if (status === undefined) {
      return new AiServiceError(
        "Couldn't reach the AI service. Please check your connection and try again.",
        "network_error"
      );
    }
    return new AiServiceError("The AI service is temporarily unavailable. Please try again.", "upstream_error");
  }
  return new AiServiceError("The AI service could not process this request.", "upstream_error");
}

// Maps an AiServiceError's code to a safe HTTP status. Deliberately never
// returns 401/403: the frontend's API client treats any 401 as an expired
// *user* session and force-logs them out — an AI-provider auth failure
// must never trigger that.
export function aiErrorStatus(error: unknown): number {
  if (error instanceof AiServiceError) {
    switch (error.code) {
      case "rate_limited":
        return 429;
      case "timeout":
        return 504;
      case "network_error":
      case "upstream_error":
        return 502;
      case "payload_too_large":
        return 413;
      case "missing_api_key":
      case "invalid_api_key":
      case "empty_response":
      case "malformed_response":
      default:
        return 500;
    }
  }
  return 500;
}

// Safe-to-log summary of any error from this service — never the API key,
// never raw request/response objects that might carry auth headers.
export function describeAiError(error: unknown): { name: string; message: string; code?: string; status?: number } {
  if (error instanceof AiServiceError) {
    return { name: error.name, message: error.message, code: error.code };
  }
  if (error instanceof Error) {
    const status = (error as any)?.status ?? (error as any)?.response?.status;
    return { name: error.name, message: error.message, status };
  }
  return { name: "UnknownError", message: String(error) };
}

export { NVIDIA_BASE_URL };
