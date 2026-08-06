import { Router } from "express";
import {
  getNotifications,
  markAsRead,
} from "../controllers/notifications.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// GET /api/notifications
router.get("/", getNotifications);

// PUT /api/notifications/:id/read
router.put("/:id/read", markAsRead);

export default router;
