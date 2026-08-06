import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users/profile
router.get("/profile", getProfile);

// PUT /api/users/profile
router.put("/profile", updateProfile);

export default router;
