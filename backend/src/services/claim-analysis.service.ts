// ─── TechEnsureX — Claim Analysis (AI-Assist) Service ───
// AI here is strictly advisory: summarization, explanation, missing-
// document detection, and natural-language risk observations. It never
// sets claim status — that stays in claims.controller.ts's deterministic
// CRUD, which remains the sole authority on approval/denial/payment.
//
// Uses the fast chat model by default; the reasoning model is only
// invoked when the caller explicitly marks a case as complex (e.g. a
// large multi-hospital claim or one with conflicting documentation) —
// not for every claim, per the "don't send every claim to Ultra" rule.

import { z } from "zod";
import { chatCompletion, MODELS, AiServiceError, type ChatMessage } from "./nvidia.js";
import { tryParseJsonObject } from "./json-repair.js";

const ClaimAnalysisSchema = z.object({
  summary: z.string(),
  missingInformation: z.array(z.string()),
  riskIndicators: z.array(z.string()),
  explanation: z.string(),
  recommendedNextAction: z.string(),
});

export type ClaimAnalysisResult = z.infer<typeof ClaimAnalysisSchema>;

const CLAIM_ANALYSIS_SYSTEM_PROMPT = `detailed thinking off

You are EnsureAI's claim analysis mode for TechEnsureX, an Indian medical insurance platform. You assist claims staff and policyholders by summarizing and explaining a claim — you do NOT decide it.

Rules:
- You are never the final authority on approval, denial, payment amount, or any legal/medical determination. Frame everything as observations for a human reviewer, not decisions.
- Use only the claim details actually supplied to you. Do not invent hospital names, amounts, dates, or documents.
- "missingInformation" should list documents/details that are typically needed for this claim type but weren't supplied — be specific and practical, not generic.
- "riskIndicators" are natural-language flags worth a human's attention (e.g. amount inconsistent with claim type, missing standard documentation) — not accusations of fraud.
- If nothing seems missing or notable, return empty arrays rather than inventing filler content.

Respond with ONLY a single JSON object, no markdown fences, no commentary:
{
  "summary": string,
  "missingInformation": [string],
  "riskIndicators": [string],
  "explanation": string,
  "recommendedNextAction": string
}

Keep every field concise — 1-3 sentences per string field, at most 5 items per array.`;

export interface ClaimAnalysisInput {
  claimId: string;
  hospital: string;
  type: string;
  amount: number;
  status: string;
  date: string;
  /** Set true only for genuinely complex cases (see module docstring) — routes to the reasoning model instead of fast chat. */
  complex?: boolean;
}

/**
 * Produces an AI-assist summary/explanation for a claim. Business rules
 * (claims.controller.ts) remain authoritative for any actual status
 * change — this is read-only advisory output.
 */
export async function analyzeClaim(input: ClaimAnalysisInput): Promise<ClaimAnalysisResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: CLAIM_ANALYSIS_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Claim details:
- Claim ID: ${input.claimId}
- Hospital: ${input.hospital}
- Type: ${input.type}
- Amount: ₹${input.amount.toLocaleString("en-IN")}
- Status: ${input.status}
- Date: ${input.date}

Summarize and explain this claim for a reviewer.`,
    },
  ];

  const model = input.complex ? MODELS.reasoning : MODELS.chat;
  // 500 tokens was observed in testing to occasionally cut the response
  // off mid-string (5 array items + 5 prose fields adds up) — the shared
  // repair parser recovers a truncated tail, but real complete text is
  // better than needing to lean on that, so the budget has headroom.
  const raw = await chatCompletion(messages, {
    model,
    maxTokens: 800,
    temperature: 0.3,
    timeoutMs: input.complex ? 120_000 : 30_000,
  });

  const parsed = tryParseJsonObject(raw);
  const result = parsed === null ? null : ClaimAnalysisSchema.safeParse(parsed);
  if (!result || !result.success) {
    // Length only — avoid logging AI-generated free text tied to a claim.
    console.warn(`analyzeClaim: response failed validation (${raw.length} chars).`);
    throw new AiServiceError(
      "The AI's response couldn't be understood. Please try again.",
      "malformed_response"
    );
  }
  return result.data;
}
