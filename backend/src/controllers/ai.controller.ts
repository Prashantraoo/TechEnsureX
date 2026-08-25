import { Request, Response } from "express";
import { chatCompletion, summarizeHealthReport } from "../services/ai.service.js";
import { AiServiceError, aiErrorStatus, describeAiError } from "../services/nvidia.js";

// Only AiServiceError messages are guaranteed user-safe (see nvidia.ts) —
// any other thrown error falls back to a generic message instead of
// leaking its own text to the client.
function safeAiMessage(error: unknown): string {
  return error instanceof AiServiceError ? error.message : "AI service unavailable. Please try again.";
}

// POST /api/ai/chat
// Streams the reply as plain-text chunks (Transfer-Encoding: chunked)
// instead of buffering the full response — the frontend renders each
// chunk as it arrives so the user sees the answer form progressively
// rather than waiting out Nemotron's full (often 10-60s+) generation.
export async function aiChat(req: Request, res: Response): Promise<void> {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ message: "Messages array is required." });
    return;
  }

  const startedAt = Date.now();
  const elapsed = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
  console.log("[AI] Request started");

  let streaming = false;
  let firstTokenLogged = false;

  try {
    await chatCompletion(messages, String(req.user!._id), (delta) => {
      if (!firstTokenLogged) {
        firstTokenLogged = true;
        console.log(`[AI] First token: ${elapsed()}`);
      }
      if (!streaming) {
        streaming = true;
        res.status(200);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
      }
      res.write(delta);
    });
    console.log(`[AI] Completed: ${elapsed()}`);
    res.end();
  } catch (error) {
    console.error("AI chat error:", describeAiError(error));
    if (!streaming) {
      // Nothing written yet — safe to send a normal JSON error response.
      res.status(aiErrorStatus(error)).json({ message: safeAiMessage(error) });
    } else {
      // Already streaming plain text to the client; can't retroactively
      // switch to a JSON error body, so just end the connection. The
      // frontend treats an abrupt stream end without visible content the
      // same as a connection failure.
      res.end();
    }
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
  } catch (error) {
    console.error("AI health summary error:", describeAiError(error));
    res.status(aiErrorStatus(error)).json({ message: safeAiMessage(error) });
  }
}
