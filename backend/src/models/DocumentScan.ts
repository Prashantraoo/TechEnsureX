import mongoose, { Schema, Document } from "mongoose";

export interface IDocumentScan extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileType: string;
  fileUrl: string;
  aiAnalysis: string;
  // Structured analysis (see ai.service.ts's DocumentAnalysisResult) —
  // `aiAnalysis` above is kept as a plain-text rendering of this for
  // surfaces that only display a string (e.g. the dashboard quick scan).
  analysis?: Record<string, unknown>;
  // null means "not enough reliable data to assess" — see
  // hasReliableRiskSignal in document-analysis.service.ts. Must never be
  // defaulted to 0; 0 is a specific claim (verified minimal risk), null
  // is "we don't know", and conflating them is exactly the bug this
  // field's nullability exists to prevent.
  riskScore: number | null;
  // Total page count of the source document (from pdf.service.ts's or
  // pdf-render.service.ts's own count — never asked of the AI model).
  pageCount?: number;
  // SHA-256 of the uploaded file's bytes, scoped per-user (see the
  // compound index below) — lets a repeat upload of the same file by the
  // same user reuse the prior analysis instead of re-extracting/re-
  // analyzing. Deliberately NOT global: two different users' identical
  // hash must never let one see the other's cached analysis.
  contentHash?: string;
  createdAt: Date;
}

const documentScanSchema = new Schema<IDocumentScan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      default: "",
    },
    aiAnalysis: {
      type: String,
      default: "",
    },
    analysis: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    pageCount: {
      type: Number,
    },
    contentHash: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Scoped to (userId, contentHash) — used to look up a reusable prior
// analysis for the same user re-uploading the same file, never across users.
documentScanSchema.index({ userId: 1, contentHash: 1 });

export const DocumentScan = mongoose.model<IDocumentScan>(
  "DocumentScan",
  documentScanSchema
);
