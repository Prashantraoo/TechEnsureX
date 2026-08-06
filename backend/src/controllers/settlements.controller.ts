import { Request, Response } from "express";
import { Settlement } from "../models/Settlement.js";

// GET /api/settlements
export async function getSettlements(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const settlements = await Settlement.find({ userId: req.user!._id }).sort({
      createdAt: -1,
    });
    res.json({ settlements });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// GET /api/settlements/:claimId
export async function getSettlementByClaimId(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const settlement = await Settlement.findOne({
      claimId: req.params.claimId,
      userId: req.user!._id,
    });

    if (!settlement) {
      res.status(404).json({ message: "Settlement not found." });
      return;
    }

    res.json({ settlement });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
