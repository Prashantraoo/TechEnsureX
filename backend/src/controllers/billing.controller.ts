import { Request, Response } from "express";
import { Billing } from "../models/Billing.js";

// GET /api/billing
export async function getBillingRecords(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const billing = await Billing.find({ userId: req.user!._id }).sort({
      dueDate: -1,
    });
    res.json({ billing });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
