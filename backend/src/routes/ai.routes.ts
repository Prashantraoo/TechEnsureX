import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { aiChat, aiHealthSummary } from "../controllers/ai.controller.js";

const router = Router();

router.post("/chat", authenticate, aiChat);
router.post("/health-summary", authenticate, aiHealthSummary);

export default router;
