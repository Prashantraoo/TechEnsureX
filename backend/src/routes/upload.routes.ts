import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  upload,
  uploadDocument,
  getUploadSignature,
  confirmDirectUpload,
  getScans,
} from "../controllers/upload.controller.js";

const router = Router();

router.post("/document", authenticate, upload.single("file"), uploadDocument);
// Direct-to-Cloudinary path for files too large for Vercel's platform
// request-body cap — see DIRECT_UPLOAD_THRESHOLD_BYTES in
// upload.controller.ts.
router.post("/signature", authenticate, getUploadSignature);
router.post("/confirm", authenticate, confirmDirectUpload);
router.get("/scans", authenticate, getScans);

export default router;
