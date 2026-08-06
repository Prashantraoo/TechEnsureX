import { Request, Response } from "express";
import { User } from "../models/User.js";

// GET /api/users/profile
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// PUT /api/users/profile
export async function updateProfile(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { name, email } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { name, email },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
