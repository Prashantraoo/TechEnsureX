import { Request, Response, NextFunction } from "express";

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
