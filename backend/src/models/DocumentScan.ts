import mongoose, { Schema, Document } from "mongoose";

export interface IDocumentScan extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileType: string;
  fileUrl: string;
  aiAnalysis: string;
  riskScore: number;
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
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const DocumentScan = mongoose.model<IDocumentScan>(
  "DocumentScan",
  documentScanSchema
);
