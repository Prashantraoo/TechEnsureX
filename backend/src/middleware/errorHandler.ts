import { Request, Response, NextFunction } from "express";
import { MAX_UPLOAD_BYTES } from "../controllers/upload.controller.js";

const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

interface AppError extends Error {
  statusCode?: number;
  code?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Error:", err.message);

  // Mongoose duplicate key error
  if (err.code === 11000) {
    res.status(400).json({
      message: "Duplicate field value. This record already exists.",
    });
    return;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    res.status(400).json({
      message: err.message,
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    res.status(400).json({
      message: "Invalid ID format.",
    });
    return;
  }

  // Multer file-upload errors (thrown before the route handler runs,
  // so they never hit uploadDocument's own try/catch — must be handled
  // here). LIMIT_FILE_SIZE is the one that actually matters for the AI
  // upload flow: surface it as a real 413, not a generic 500.
  if (err.name === "MulterError") {
    const code = (err as any).code;
    if (code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        message: `This file exceeds the ${MAX_UPLOAD_MB}MB upload limit. Please upload a smaller document.`,
      });
      return;
    }
    res.status(400).json({ message: err.message || "File upload failed." });
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({
      message: "Invalid token.",
    });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({
      message: "Token has expired.",
    });
    return;
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : err.message,
  });
}
