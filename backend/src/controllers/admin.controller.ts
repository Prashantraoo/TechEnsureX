import { Request, Response } from "express";
import { User } from "../models/User.js";
import { Claim } from "../models/Claim.js";
import { InsurancePlan } from "../models/InsurancePlan.js";

// GET /api/admin/stats
export async function getAdminStats(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const [totalUsers, totalClaims, totalPlans, approvedClaims, rejectedClaims] =
      await Promise.all([
        User.countDocuments(),
        Claim.countDocuments(),
        InsurancePlan.countDocuments(),
        Claim.countDocuments({ status: "Approved" }),
        Claim.countDocuments({ status: "Rejected" }),
      ]);

    const totalAmount = await Claim.aggregate([
      { $match: { status: "Approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      stats: {
        totalUsers,
        totalClaims,
        totalPlans,
        approvedClaims,
        rejectedClaims,
        totalApprovedAmount: totalAmount[0]?.total || 0,
        successRate:
          totalClaims > 0
            ? ((approvedClaims / totalClaims) * 100).toFixed(1)
            : "0",
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// GET /api/admin/users
export async function getAdminUsers(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
