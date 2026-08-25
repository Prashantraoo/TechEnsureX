// ─── TechEnsureX — RAG / Policy Retrieval Service ───────
// Foundation for grounding chat answers in TechEnsureX's actual
// insurance-plan data instead of the model's own training knowledge.
//
//   documents → chunking → Nemotron embeddings → vector store
//   → semantic retrieval → relevant chunks → fast chat model → answer
//
// Similarity search runs in application code over chunks pulled from
// Mongo (see PolicyChunk.ts for why that's the right scale-appropriate
// choice today). Indexes InsurancePlan records; the same pipeline would
// apply to real policy-document PDFs once those exist as a source.

import { InsurancePlan } from "../models/InsurancePlan.js";
import { PolicyChunk } from "../models/PolicyChunk.js";
import { chunkText, cosineSimilarity } from "./chunking.js";
import { embed } from "./nvidia.js";

// Below this similarity, a chunk isn't actually relevant to the query —
// returning it anyway is how RAG systems end up "grounding" answers in
// unrelated context. Tuned conservatively; better to retrieve nothing
// and say so than to retrieve a weak match and answer from it.
const RELEVANCE_THRESHOLD = 0.35;
const TOP_K = 4;

function renderPlanAsText(plan: {
  name: string;
  insurer: string;
  premium: number;
  cover: string;
  rating: number;
  features: string[];
}): string {
  return [
    `Plan: ${plan.name}`,
    `Insurer: ${plan.insurer}`,
    `Annual premium: ₹${plan.premium.toLocaleString("en-IN")}`,
    `Cover amount: ${plan.cover}`,
    `Rating: ${plan.rating}/5`,
    `Features: ${plan.features.join("; ")}`,
  ].join("\n");
}

/**
 * (Re-)indexes all insurance plans into the vector store. Idempotent —
 * safe to call repeatedly (e.g. after seeding, or on a schedule once
 * plans can be edited); clears and rebuilds each plan's chunks rather
 * than appending, so it never accumulates stale duplicates.
 */
export async function indexInsurancePlans(): Promise<{ plans: number; chunks: number }> {
  const plans = await InsurancePlan.find();
  let totalChunks = 0;

  for (const plan of plans) {
    const text = renderPlanAsText(plan);
    const chunks = chunkText(text);
    if (chunks.length === 0) continue;

    const embeddings = await embed(
      chunks.map((c) => c.text),
      "passage"
    );

    await PolicyChunk.deleteMany({ sourceType: "insurance_plan", sourceId: plan._id });
    await PolicyChunk.insertMany(
      chunks.map((c, i) => ({
        sourceType: "insurance_plan" as const,
        sourceId: plan._id,
        sourceName: plan.name,
        chunkIndex: c.index,
        text: c.text,
        embedding: embeddings[i],
      }))
    );
    totalChunks += chunks.length;
  }

  return { plans: plans.length, chunks: totalChunks };
}

export interface RetrievedChunk {
  sourceName: string;
  text: string;
  score: number;
}

/**
 * Embeds the query and returns the most relevant indexed chunks above
 * RELEVANCE_THRESHOLD, best first. Returns [] when nothing is relevant
 * enough — callers must treat that as "no grounding available", not
 * silently fall through to an ungrounded guess.
 */
export async function retrieveRelevantChunks(query: string): Promise<RetrievedChunk[]> {
  const all = await PolicyChunk.find().lean();
  if (all.length === 0) return [];

  const [queryEmbedding] = await embed([query], "query");

  return all
    .map((c) => ({
      sourceName: c.sourceName,
      text: c.text,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .filter((c) => c.score >= RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
}

/** Renders retrieved chunks as a grounding block to prepend to chat context. */
export function formatRetrievedContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c, i) => `[Source ${i + 1}: ${c.sourceName}]\n${c.text}`)
    .join("\n\n");
}
