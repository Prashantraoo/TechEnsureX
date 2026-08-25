import { Request, Response, NextFunction } from "express";
import { InsurancePlan } from "../models/InsurancePlan.js";

// GET /api/plans
export async function getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plans = await InsurancePlan.find().sort({ popular: -1, rating: -1 });
    res.json({ plans });
  } catch (error) {
    next(error);
  }
}

// GET /api/plans/:id
export async function getPlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plan = await InsurancePlan.findById(req.params.id);
    if (!plan) {
      res.status(404).json({ message: "Plan not found." });
      return;
    }
    res.json({ plan });
  } catch (error) {
    next(error);
  }
}
