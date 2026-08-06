import { Router } from "express";
import { getBillingRecords } from "../controllers/billing.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// GET /api/billing
router.get("/", getBillingRecords);

export default router;
