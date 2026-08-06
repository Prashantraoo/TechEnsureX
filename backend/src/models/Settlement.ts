import mongoose, { Schema, Document } from "mongoose";

export interface ISettlementStage {
  label: string;
  time: string;
  done: boolean;
  active: boolean;
}

export interface ISettlement extends Document {
  claimId: string;
  userId: mongoose.Types.ObjectId;
  amount: number;
  stages: ISettlementStage[];
  blockchainTxHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const settlementStageSchema = new Schema<ISettlementStage>(
  {
    label: { type: String, required: true },
    time: { type: String, required: true },
    done: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
  },
  { _id: false }
);

const settlementSchema = new Schema<ISettlement>(
  {
    claimId: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    stages: {
      type: [settlementStageSchema],
      default: [],
    },
    blockchainTxHash: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Settlement = mongoose.model<ISettlement>(
  "Settlement",
  settlementSchema
);
