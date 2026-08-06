import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import claimsRoutes from "./routes/claims.routes.js";
import plansRoutes from "./routes/plans.routes.js";
import settlementsRoutes from "./routes/settlements.routes.js";
import healthRoutes from "./routes/health.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import medicalHistoryRoutes from "./routes/medical-history.routes.js";

const app = express();

// ─── Middleware ──────────────────────────────────────────
app.use(
  cors({
    origin: [env.FRONTEND_URL, "http://localhost:8080", "http://127.0.0.1:8080"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ─── API Routes ─────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/claims", claimsRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/settlements", settlementsRoutes);
app.use("/api/health-report", healthRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/medical-history", medicalHistoryRoutes);

// ─── Health Check ───────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "HealthGuard AI Backend",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
async function start() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   🏥 HealthGuard AI Backend                  ║
║   🚀 Running on http://localhost:${env.PORT}        ║
║   📦 Environment: ${env.NODE_ENV.padEnd(22)}  ║
╚══════════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);
