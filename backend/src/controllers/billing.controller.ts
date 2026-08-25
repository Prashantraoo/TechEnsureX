import { Request, Response, NextFunction } from "express";
import { Billing } from "../models/Billing.js";

// GET /api/billing
export async function getBillingRecords(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const billing = await Billing.find({ userId: req.user!._id }).sort({
      dueDate: -1,
    });
    res.json({ billing });
  } catch (error) {
    next(error);
  }
}
