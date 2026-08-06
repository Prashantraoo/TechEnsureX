import { Router } from "express";
import {
  getAdminStats,
  getAdminUsers,
} from "../controllers/admin.controller.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorizeAdmin);

// GET /api/admin/stats
router.get("/stats", getAdminStats);

// GET /api/admin/users
router.get("/users", getAdminUsers);

export default router;
