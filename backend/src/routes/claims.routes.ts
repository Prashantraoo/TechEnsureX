import { Router } from "express";
import { body } from "express-validator";
import {
  getClaims,
  createClaim,
  getClaimById,
  updateClaimStatus,
} from "../controllers/claims.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/claims
router.get("/", getClaims);

// POST /api/claims
router.post(
  "/",
  validate([
    body("hospital").trim().notEmpty().withMessage("Hospital is required"),
    body("type").trim().notEmpty().withMessage("Claim type is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
  ]),
  createClaim
);

// GET /api/claims/:id
router.get("/:id", getClaimById);

// PUT /api/claims/:id
router.put(
  "/:id",
  validate([
    body("status")
      .isIn(["Approved", "Processing", "AI Verification", "Rejected"])
      .withMessage("Invalid status"),
  ]),
  updateClaimStatus
);

export default router;
