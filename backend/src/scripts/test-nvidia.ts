// ─── NVIDIA Nemotron connection test ─────────────────────
// Safe, local-only sanity check — never prints the API key, only the
// model's reply. Run with: npm run test:nvidia (from backend/)

import { chatCompletion } from "../services/nvidia.js";

async function main() {
  console.log("Sending a test prompt to NVIDIA Nemotron...");
  const reply = await chatCompletion([
    { role: "user", content: "Explain what a health insurance deductible is in simple terms." },
  ]);
  console.log("\n--- Nemotron reply ---\n");
  console.log(reply);
  console.log("\n--- End of reply ---\n");
  console.log("✅ NVIDIA Nemotron connection working.");
}

main().catch((error) => {
  console.error("❌ NVIDIA Nemotron test failed:", error?.message || error);
  process.exit(1);
});
