import mongoose, { Schema, Document } from "mongoose";

export interface IInsurancePlan extends Document {
  name: string;
  insurer: string;
  premium: number;
  cover: string;
  rating: number;
  popular: boolean;
  features: string[];
  createdAt: Date;
}

const insurancePlanSchema = new Schema<IInsurancePlan>(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
    },
    insurer: {
      type: String,
      required: [true, "Insurer name is required"],
      trim: true,
    },
    premium: {
      type: Number,
      required: [true, "Premium is required"],
      min: 0,
    },
    cover: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.0,
    },
    popular: {
      type: Boolean,
      default: false,
    },
    features: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const InsurancePlan = mongoose.model<IInsurancePlan>(
  "InsurancePlan",
  insurancePlanSchema
);
