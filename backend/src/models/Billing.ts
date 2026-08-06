import mongoose, { Schema, Document } from "mongoose";

export interface IBilling extends Document {
  userId: mongoose.Types.ObjectId;
  planName: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
}

const billingSchema = new Schema<IBilling>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planName: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    status: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "pending",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Billing = mongoose.model<IBilling>("Billing", billingSchema);
