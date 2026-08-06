import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { upload, uploadDocument, getScans } from "../controllers/upload.controller.js";

const router = Router();

router.post("/document", authenticate, upload.single("file"), uploadDocument);
router.get("/scans", authenticate, getScans);

export default router;
