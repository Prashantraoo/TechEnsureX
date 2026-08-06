// ─── HealthGuard AI — OpenRouter AI Service ─────────────
// Wraps OpenRouter API for chat, document analysis, and health summaries.

import { env } from "../config/env.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenRouter(
  messages: ChatMessage[],
  model = "meta-llama/llama-4-maverick"
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.FRONTEND_URL,
      "X-Title": "HealthGuard AI",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenRouter error:", res.status, err);
    throw new Error(`AI service error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
}

// ─── Chat Completion ────────────────────────────────────
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const systemMsg: ChatMessage = {
    role: "system",
    content: `You are EnsureAI, an expert AI insurance and healthcare assistant for TechEnsureX — an Indian medical insurance platform. You help users with:
- Insurance claims, policies, and coverage questions
- Finding cashless hospitals and plan comparisons
- Understanding medical bills and deductibles
- Health risk assessments and wellness tips
Be concise, helpful, and friendly. Use Indian Rupee (₹) for amounts. If you don't know something specific about a user's account, say so honestly.`,
  };

  return callOpenRouter([systemMsg, ...messages]);
}

// ─── Document Analysis ──────────────────────────────────
export async function analyzeDocument(
  extractedText: string,
  fileName: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI medical document analyzer for TechEnsureX insurance platform. Analyze the uploaded medical document and provide:
1. **Document Summary** — what kind of document this is
2. **Key Line Items** — extracted charges, procedures, medications
3. **Risk Score** (0-100) — likelihood of fraud or discrepancy
4. **Coverage Match** — how well this aligns with standard insurance coverage
5. **Recommendations** — next steps for the user

Format your response with clear sections using markdown. Use ₹ for amounts.`,
    },
    {
      role: "user",
      content: `Analyze this medical document (filename: ${fileName}):\n\n${extractedText}`,
    },
  ];

  return callOpenRouter(messages);
}

// ─── Health Report Summary ──────────────────────────────
export async function summarizeHealthReport(reportData: {
  cardiovascularRisk: number;
  diabetesRisk: number;
  wellnessScore: number;
  vitals?: Record<string, string>;
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI health analyst for TechEnsureX. Based on the user's health data, provide:
1. **Overall Assessment** — brief health status summary
2. **Risk Analysis** — explain each risk factor
3. **Personalized Recommendations** — actionable steps
4. **Insurance Implications** — how this affects their coverage needs

Be empathetic, professional, and specific. Use Indian context for hospitals and treatments.`,
    },
    {
      role: "user",
      content: `My health report data:
- Cardiovascular Risk: ${reportData.cardiovascularRisk}%
- Diabetes Risk: ${reportData.diabetesRisk}%  
- Wellness Score: ${reportData.wellnessScore}/100
${reportData.vitals ? `- Vitals: ${JSON.stringify(reportData.vitals)}` : ""}

Please analyze and provide recommendations.`,
    },
  ];

  return callOpenRouter(messages);
}
