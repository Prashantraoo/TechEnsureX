import { Request, Response } from "express";
import { chatCompletion, summarizeHealthReport } from "../services/ai.service.js";

// POST /api/ai/chat
export async function aiChat(req: Request, res: Response): Promise<void> {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ message: "Messages array is required." });
      return;
    }

    const reply = await chatCompletion(messages);
    res.json({ reply });
  } catch (error: any) {
    console.error("AI chat error:", error);
    res.status(500).json({ message: error.message || "AI service unavailable." });
  }
}

// POST /api/ai/health-summary
export async function aiHealthSummary(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { cardiovascularRisk, diabetesRisk, wellnessScore, vitals } = req.body;

    const summary = await summarizeHealthReport({
      cardiovascularRisk: cardiovascularRisk ?? 0,
      diabetesRisk: diabetesRisk ?? 0,
      wellnessScore: wellnessScore ?? 50,
      vitals,
    });

    res.json({ summary });
  } catch (error: any) {
    console.error("AI health summary error:", error);
    res.status(500).json({ message: error.message || "AI service unavailable." });
  }
}
