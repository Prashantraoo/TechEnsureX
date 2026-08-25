import mongoose, { Schema, Document } from "mongoose";

// ─── RAG vector store (foundation) ───────────────────────
// One document per embedded chunk. Similarity search is done in
// application code (cosine similarity over chunks loaded into memory —
// see rag.service.ts) rather than a dedicated vector index, which is
// the right tradeoff at this data scale (a handful of insurance plans)
// and the natural place to swap in a real vector index (Atlas Vector
// Search, pgvector, etc.) later without changing the calling code.

export interface IPolicyChunk extends Document {
  sourceType: "insurance_plan";
  sourceId: mongoose.Types.ObjectId;
  sourceName: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: Date;
}

const policyChunkSchema = new Schema<IPolicyChunk>(
  {
    sourceType: {
      type: String,
      enum: ["insurance_plan"],
      required: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    sourceName: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const PolicyChunk = mongoose.model<IPolicyChunk>("PolicyChunk", policyChunkSchema);
