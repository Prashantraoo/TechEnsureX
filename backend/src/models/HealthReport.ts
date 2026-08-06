import mongoose, { Schema, Document } from "mongoose";

export interface IHealthReport extends Document {
  userId: mongoose.Types.ObjectId;
  cardiovascularRisk: number;
  diabetesRisk: number;
  wellnessScore: number;
  updatedAt: Date;
}

const healthReportSchema = new Schema<IHealthReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    cardiovascularRisk: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    diabetesRisk: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    wellnessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
  },
  {
    timestamps: true,
  }
);

export const HealthReport = mongoose.model<IHealthReport>(
  "HealthReport",
  healthReportSchema
);
