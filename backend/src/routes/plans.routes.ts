import { Router } from "express";
import { getPlans, getPlanById } from "../controllers/plans.controller.js";

const router = Router();

// GET /api/plans (public)
router.get("/", getPlans);

// GET /api/plans/:id (public)
router.get("/:id", getPlanById);

export default router;
