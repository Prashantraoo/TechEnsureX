import { Request, Response, NextFunction } from "express";
import { Notification } from "../models/Notification.js";

// GET /api/notifications
export async function getNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const notifications = await Notification.find({
      userId: req.user!._id,
    }).sort({ createdAt: -1 });

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}

// PUT /api/notifications/:id/read
export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ message: "Notification not found." });
      return;
    }

    res.json({ message: "Marked as read.", notification });
  } catch (error) {
    next(error);
  }
}
