import { Request, Response } from "express";
import { HealthReport } from "../models/HealthReport.js";

// GET /api/health-report
export async function getHealthReport(
  req: Request,
  res: Response
): Promise<void> {
  try {
    let report = await HealthReport.findOne({ userId: req.user!._id });

    if (!report) {
      // Create a default report if none exists
      report = await HealthReport.create({
        userId: req.user!._id,
        cardiovascularRisk: 18,
        diabetesRisk: 32,
        wellnessScore: 84,
      });
    }

    res.json({ report });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// PUT /api/health-report
export async function updateHealthReport(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { cardiovascularRisk, diabetesRisk, wellnessScore } = req.body;

    const report = await HealthReport.findOneAndUpdate(
      { userId: req.user!._id },
      { cardiovascularRisk, diabetesRisk, wellnessScore },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ message: "Health report updated.", report });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
