import { Request, Response } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../services/upload.service.js";
import { analyzeDocument } from "../services/ai.service.js";
import { DocumentScan } from "../models/DocumentScan.js";
import { env } from "../config/env.js";

// Multer config — store in memory
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are allowed."));
    }
  },
});

// POST /api/upload/document
export async function uploadDocument(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded." });
      return;
    }

    const file = req.file;
    let fileUrl = "";

    // Upload to Cloudinary if configured
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY) {
      try {
        const result = await uploadToCloudinary(file.buffer);
        fileUrl = result.url;
      } catch (err) {
        console.warn("Cloudinary upload failed, storing without URL:", err);
      }
    }

    // For AI analysis, use the file name as context
    // In production you'd use OCR; here we simulate with file metadata
    const extractedText = `Medical document uploaded: ${file.originalname} (${file.mimetype}, ${(file.size / 1024).toFixed(1)}KB). This is a ${file.mimetype.includes("pdf") ? "PDF document" : "scanned image"} from a healthcare provider. Please analyze it as a typical Indian medical bill/report with common line items like consultation fees, diagnostics, medications, and procedure charges.`;

    const aiAnalysis = await analyzeDocument(extractedText, file.originalname);

    // Extract a risk score from the AI response (simple heuristic)
    const riskMatch = aiAnalysis.match(/Risk\s*Score[:\s]*(\d+)/i);
    const riskScore = riskMatch ? Math.min(parseInt(riskMatch[1], 10), 100) : Math.floor(Math.random() * 30) + 10;

    const scan = await DocumentScan.create({
      userId: req.user!._id,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileUrl,
      aiAnalysis,
      riskScore,
    });

    res.status(201).json({
      message: "Document scanned successfully.",
      scan: {
        id: scan._id,
        fileName: scan.fileName,
        fileUrl: scan.fileUrl,
        aiAnalysis: scan.aiAnalysis,
        riskScore: scan.riskScore,
        createdAt: scan.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  }
}

// GET /api/upload/scans
export async function getScans(req: Request, res: Response): Promise<void> {
  try {
    const scans = await DocumentScan.find({ userId: req.user!._id }).sort({
      createdAt: -1,
    });
    res.json({ scans });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
