// ─── TechEnsureX — Text Chunking Utility ─────────────────
// Generic sliding-window chunker with overlap, shared by anything that
// needs to feed text into the embedding model in bounded pieces (RAG
// indexing today; could equally chunk a long policy PDF's extracted
// text in the future via the same function).

export interface Chunk {
  text: string;
  index: number;
}

const DEFAULT_MAX_CHARS = 800;
const DEFAULT_OVERLAP_CHARS = 120;

/**
 * Splits text into overlapping chunks, breaking on paragraph/sentence
 * boundaries where possible rather than mid-word, so each chunk reads
 * as a coherent unit for embedding and for the "cite the source chunk"
 * requirement.
 */
export function chunkText(
  text: string,
  maxChars: number = DEFAULT_MAX_CHARS,
  overlapChars: number = DEFAULT_OVERLAP_CHARS
): Chunk[] {
  const clean = text.trim();
  if (clean.length === 0) return [];
  if (clean.length <= maxChars) return [{ text: clean, index: 0 }];

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);

    if (end < clean.length) {
      // Prefer breaking at a paragraph, then sentence, then word boundary
      // within the tail of the window, so chunks don't split mid-sentence
      // when avoidable.
      const window = clean.slice(start, end);
      const paraBreak = window.lastIndexOf("\n\n");
      const sentenceBreak = Math.max(window.lastIndexOf(". "), window.lastIndexOf(".\n"));
      const spaceBreak = window.lastIndexOf(" ");
      const breakPoint = paraBreak > maxChars * 0.5 ? paraBreak : sentenceBreak > maxChars * 0.5 ? sentenceBreak + 1 : spaceBreak;
      if (breakPoint > 0) end = start + breakPoint;
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk.length > 0) chunks.push({ text: chunk, index: index++ });

    if (end >= clean.length) break;
    start = Math.max(end - overlapChars, start + 1); // always make progress
  }

  return chunks;
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
