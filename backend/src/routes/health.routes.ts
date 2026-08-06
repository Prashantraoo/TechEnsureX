import { Router } from "express";
import {
  getHealthReport,
  updateHealthReport,
} from "../controllers/health.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// GET /api/health-report
router.get("/", getHealthReport);

// PUT /api/health-report
router.put("/", updateHealthReport);

export default router;
