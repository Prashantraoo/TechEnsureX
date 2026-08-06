import { Request, Response } from "express";
import { Claim } from "../models/Claim.js";

// GET /api/claims
export async function getClaims(req: Request, res: Response): Promise<void> {
  try {
    const claims = await Claim.find({ userId: req.user!._id }).sort({
      date: -1,
    });
    res.json({ claims });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// POST /api/claims
export async function createClaim(req: Request, res: Response): Promise<void> {
  try {
    const { hospital, type, amount } = req.body;

    // Generate a claim ID
    const count = await Claim.countDocuments();
    const claimId = `CL-${(2041 + count).toString()}`;

    // Generate a fake blockchain hash
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// GET /api/claims/:id
export async function getClaimById(
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

    res.json({ claim });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// PUT /api/claims/:id
export async function updateClaimStatus(
  req: Request,
  res: Response
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
