import mongoose, { Schema, Document } from "mongoose";

export interface IMedicalRecord {
  date: Date;
  diagnosis: string;
  hospital: string;
  doctor: string;
  notes: string;
}

export interface IMedicalHistory extends Document {
  userId: mongoose.Types.ObjectId;
  records: IMedicalRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    date: { type: Date, required: true },
    diagnosis: { type: String, required: true, trim: true },
    hospital: { type: String, required: true, trim: true },
    doctor: { type: String, required: true, trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const medicalHistorySchema = new Schema<IMedicalHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    records: {
      type: [medicalRecordSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const MedicalHistory = mongoose.model<IMedicalHistory>(
  "MedicalHistory",
  medicalHistorySchema
);
