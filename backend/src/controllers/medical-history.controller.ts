import { Request, Response } from "express";
import { MedicalHistory } from "../models/MedicalHistory.js";

// GET /api/medical-history
export async function getMedicalHistory(
  req: Request,
  res: Response
): Promise<void> {
  try {
    let history = await MedicalHistory.findOne({ userId: req.user!._id });

    if (!history) {
      history = await MedicalHistory.create({
        userId: req.user!._id,
        records: [],
      });
    }

    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// POST /api/medical-history
export async function addMedicalRecord(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { date, diagnosis, hospital, doctor, notes } = req.body;

    if (!date || !diagnosis || !hospital || !doctor) {
      res
        .status(400)
        .json({ message: "Date, diagnosis, hospital, and doctor are required." });
      return;
    }

    let history = await MedicalHistory.findOne({ userId: req.user!._id });

    if (!history) {
      history = await MedicalHistory.create({
        userId: req.user!._id,
        records: [],
      });
    }

    history.records.push({ date, diagnosis, hospital, doctor, notes: notes || "" });
    await history.save();

    res.status(201).json({ message: "Record added.", history });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
