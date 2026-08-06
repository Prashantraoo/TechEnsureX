import { Router } from "express";
import {
  getSettlements,
  getSettlementByClaimId,
} from "../controllers/settlements.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// GET /api/settlements
router.get("/", getSettlements);

// GET /api/settlements/:claimId
router.get("/:claimId", getSettlementByClaimId);

export default router;
