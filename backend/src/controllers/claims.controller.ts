import { Request, Response, NextFunction } from "express";
import { Claim } from "../models/Claim.js";
import { analyzeClaim } from "../services/claim-analysis.service.js";
import { AiServiceError, aiErrorStatus, describeAiError } from "../services/nvidia.js";

// GET /api/claims
export async function getClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claims = await Claim.find({ userId: req.user!._id }).sort({
      date: -1,
    });
    res.json({ claims });
  } catch (error) {
    next(error);
  }
}

// POST /api/claims
export async function createClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { hospital, type, amount } = req.body;

    // Generate a claim ID
    const count = await Claim.countDocuments();
    const claimId = `CL-${(2041 + count).toString()}`;

    // Generate a verification hash for the claim's audit trail
    const chars = "0123456789abcdef";
    let hash = "0x";
    for (let i = 0; i < 4; i++) hash += chars[Math.floor(Math.random() * 16)];
    hash += "..";
    for (let i = 0; i < 2; i++) hash += chars[Math.floor(Math.random() * 16)];

    const claim = await Claim.create({
      claimId,
      userId: req.user!._id,
      hospital,
      type,
      amount,
      date: new Date(),
      status: "Processing",
      blockchainHash: hash,
    });

    res.status(201).json({ message: "Claim created successfully.", claim });
  } catch (error) {
    next(error);
  }
}

// GET /api/claims/:id
export async function getClaimById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const claim = await Claim.findOne({
      claimId: req.params.id,
      userId: req.user!._id,
    });

    if (!claim) {
      res.status(404).json({ message: "Claim not found." });
      return;
    }

    res.json({ claim });
  } catch (error) {
    next(error);
  }
}

// POST /api/claims/:id/analyze
// AI-assist only — summarization, missing-document detection, and
// natural-language risk observations for a human reviewer. Never sets or
// changes claim status; that stays deterministic in updateClaimStatus.
export async function analyzeClaimById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const claim = await Claim.findOne({
      claimId: req.params.id,
      userId: req.user!._id,
    });

    if (!claim) {
      res.status(404).json({ message: "Claim not found." });
      return;
    }

    // Large claims are the case genuinely worth the reasoning model's
    // extra latency; everything else uses the fast chat model.
    const complex = claim.amount >= 200_000;

    const analysis = await analyzeClaim({
      claimId: claim.claimId,
      hospital: claim.hospital,
      type: claim.type,
      amount: claim.amount,
      status: claim.status,
      date: claim.date.toISOString(),
      complex,
    });

    res.json({ analysis });
  } catch (error) {
    if (error instanceof AiServiceError) {
      console.error("Claim analysis error:", describeAiError(error));
      res.status(aiErrorStatus(error)).json({ message: error.message });
      return;
    }
    console.error("Claim analysis error:", error);
    res.status(500).json({ message: "Could not analyze this claim." });
  }
}

// PUT /api/claims/:id
export async function updateClaimStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { status } = req.body;

    const claim = await Claim.findOneAndUpdate(
      { claimId: req.params.id },
      { status },
      { new: true, runValidators: true }
    );

    if (!claim) {
      res.status(404).json({ message: "Claim not found." });
      return;
    }

    res.json({ message: "Claim status updated.", claim });
  } catch (error) {
    next(error);
  }
}
