import { Request, Response, NextFunction } from "express";
import { HealthReport } from "../models/HealthReport.js";

// GET /api/health-report
export async function getHealthReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // No report until the user has real data for one — never fabricate
    // risk/wellness numbers just so the dashboard has something to show.
    const report = await HealthReport.findOne({ userId: req.user!._id });
    res.json({ report });
  } catch (error) {
    next(error);
  }
}

// PUT /api/health-report
export async function updateHealthReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { cardiovascularRisk, diabetesRisk, wellnessScore } = req.body;

    const report = await HealthReport.findOneAndUpdate(
      { userId: req.user!._id },
      { cardiovascularRisk, diabetesRisk, wellnessScore },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ message: "Health report updated.", report });
  } catch (error) {
    next(error);
  }
}
