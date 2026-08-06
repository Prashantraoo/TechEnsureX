import mongoose, { Schema, Document } from "mongoose";

export interface IClaim extends Document {
  claimId: string;
  userId: mongoose.Types.ObjectId;
  hospital: string;
  type: string;
  amount: number;
  date: Date;
  status: "Approved" | "Processing" | "AI Verification" | "Rejected";
  blockchainHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const claimSchema = new Schema<IClaim>(
  {
    claimId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hospital: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Claim type is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Approved", "Processing", "AI Verification", "Rejected"],
      default: "Processing",
    },
    blockchainHash: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Claim = mongoose.model<IClaim>("Claim", claimSchema);
