import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getMedicalHistory,
  addMedicalRecord,
} from "../controllers/medical-history.controller.js";

const router = Router();

router.get("/", authenticate, getMedicalHistory);
router.post("/", authenticate, addMedicalRecord);

export default router;
