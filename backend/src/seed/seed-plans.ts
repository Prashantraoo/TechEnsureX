// ─── Additive insurance-plan seeder ─────────────────────
// `npm run seed` is a DEMO seeder: it wipes users, claims, settlements,
// reports, notifications and billing before rebuilding them, so it must
// never be pointed at a database with real data in it. This script
// exists for the one collection that is catalog data rather than user
// data — it upserts INSURANCE_PLANS by name and touches nothing else,
// so it is safe to run against production and safe to run repeatedly.
//
// Motivation: production was found serving an empty InsurancePlan
// collection, which silently emptied the Insurance Plans page and left
// chat's RAG grounding with nothing to retrieve ("[RAG] Indexed 0
// insurance plan(s)"), with no error raised anywhere.

import mongoose from "mongoose";
import { env } from "../config/env.js";
import { InsurancePlan } from "../models/InsurancePlan.js";
import { INSURANCE_PLANS } from "./plans.js";

async function seedPlans(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log("✅ Connected");

  const before = await InsurancePlan.countDocuments();
  const result = await InsurancePlan.bulkWrite(
    INSURANCE_PLANS.map((plan) => ({
      updateOne: { filter: { name: plan.name }, update: { $set: plan }, upsert: true },
    }))
  );
  const after = await InsurancePlan.countDocuments();

  console.log(
    `📋 Plans: ${before} before → ${after} after (${result.upsertedCount} inserted, ${result.modifiedCount} updated)`
  );
  await mongoose.disconnect();
}

seedPlans().catch((error) => {
  console.error("Plan seed failed:", error);
  process.exitCode = 1;
});
