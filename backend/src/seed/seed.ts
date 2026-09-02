import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Claim } from "../models/Claim.js";
import { InsurancePlan } from "../models/InsurancePlan.js";
import { INSURANCE_PLANS } from "./plans.js";
import { Settlement } from "../models/Settlement.js";
import { HealthReport } from "../models/HealthReport.js";
import { Notification } from "../models/Notification.js";
import { Billing } from "../models/Billing.js";
import { MedicalHistory } from "../models/MedicalHistory.js";

async function seed() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ Connected to MongoDB for seeding");

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Claim.deleteMany({}),
      InsurancePlan.deleteMany({}),
      Settlement.deleteMany({}),
      HealthReport.deleteMany({}),
      Notification.deleteMany({}),
      Billing.deleteMany({}),
      MedicalHistory.deleteMany({}),
    ]);
    console.log("🗑️  Cleared existing data");

    // ─── Create Users ───────────────────────────────────
    const testUser = await User.create({
      name: "Aarav Sharma",
      email: "test@hospital.com",
      password: "password123",
      role: "user",
    });

    const adminUser = await User.create({
      name: "Admin",
      email: "admin@techensurex.com",
      password: "admin123456",
      role: "admin",
    });

    console.log("👤 Created users");

    // ─── Create Insurance Plans ─────────────────────────
    await InsurancePlan.insertMany([...INSURANCE_PLANS]);
    console.log("📋 Created insurance plans");

    // ─── Create Claims ──────────────────────────────────
    const claims = await Claim.insertMany([
      {
        claimId: "CL-2041",
        userId: testUser._id,
        hospital: "Apollo, Bandra",
        type: "Cardiology",
        amount: 124500,
        date: new Date("2026-04-22"),
        status: "Approved",
        blockchainHash: "0x4a..91",
      },
      {
        claimId: "CL-2040",
        userId: testUser._id,
        hospital: "Fortis, Mulund",
        type: "Orthopedic",
        amount: 86200,
        date: new Date("2026-04-19"),
        status: "Processing",
        blockchainHash: "0x9b..2f",
      },
      {
        claimId: "CL-2039",
        userId: testUser._id,
        hospital: "Max, Saket",
        type: "Pediatric",
        amount: 32400,
        date: new Date("2026-04-15"),
        status: "AI Verification",
        blockchainHash: "0xc1..8d",
      },
      {
        claimId: "CL-2038",
        userId: testUser._id,
        hospital: "Manipal, Whitefield",
        type: "Dermatology",
        amount: 14800,
        date: new Date("2026-04-11"),
        status: "Approved",
        blockchainHash: "0x77..a3",
      },
      {
        claimId: "CL-2037",
        userId: testUser._id,
        hospital: "Kokilaben, Mumbai",
        type: "Diagnostics",
        amount: 8200,
        date: new Date("2026-04-08"),
        status: "Rejected",
        blockchainHash: "0x12..b5",
      },
      {
        claimId: "CL-2036",
        userId: testUser._id,
        hospital: "AIIMS, Delhi",
        type: "Surgery",
        amount: 218000,
        date: new Date("2026-04-02"),
        status: "Approved",
        blockchainHash: "0x88..d2",
      },
    ]);
    console.log("📄 Created claims");

    // ─── Create Settlement ──────────────────────────────
    await Settlement.create({
      claimId: "CL-2041",
      userId: testUser._id,
      amount: 124500,
      stages: [
        { label: "Submitted", time: "Apr 22, 09:14", done: true, active: false },
        { label: "Under Review", time: "Apr 22, 09:18", done: true, active: false },
        { label: "AI Verification", time: "Apr 22, 09:22", done: true, active: false },
        { label: "Approved", time: "Apr 22, 09:31", done: true, active: false },
        { label: "Settled", time: "Awaiting payout", done: false, active: true },
      ],
      blockchainTxHash:
        "0x4a91b2c8f9d3e2a1b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5",
    });
    console.log("💰 Created settlements");

    // ─── Create Health Report ───────────────────────────
    await HealthReport.create({
      userId: testUser._id,
      cardiovascularRisk: 18,
      diabetesRisk: 32,
      wellnessScore: 84,
    });
    console.log("❤️  Created health report");

    // ─── Create Notifications ───────────────────────────
    await Notification.insertMany([
      {
        userId: testUser._id,
        title: "Claim CL-2041 Approved",
        message:
          "Your cardiology claim for ₹1,24,500 at Apollo, Bandra has been approved.",
        read: false,
        type: "success",
      },
      {
        userId: testUser._id,
        title: "AI Verification in Progress",
        message:
          "Claim CL-2039 is currently undergoing AI-powered fraud verification.",
        read: false,
        type: "info",
      },
      {
        userId: testUser._id,
        title: "Claim CL-2037 Rejected",
        message:
          "Your diagnostics claim for ₹8,200 at Kokilaben, Mumbai was rejected. Please review.",
        read: true,
        type: "error",
      },
      {
        userId: testUser._id,
        title: "Premium Due Reminder",
        message:
          "Your Star Health Family Optima premium of ₹18,400 is due on May 1, 2026.",
        read: false,
        type: "warning",
      },
    ]);
    console.log("🔔 Created notifications");

    // ─── Create Billing Records ─────────────────────────
    await Billing.insertMany([
      {
        userId: testUser._id,
        planName: "Star Health Family Optima",
        amount: 18400,
        status: "paid",
        dueDate: new Date("2026-01-01"),
        paidAt: new Date("2025-12-28"),
      },
      {
        userId: testUser._id,
        planName: "Star Health Family Optima",
        amount: 18400,
        status: "pending",
        dueDate: new Date("2026-05-01"),
      },
    ]);
    console.log("💳 Created billing records");

    // ─── Create Medical History ─────────────────────────
    await MedicalHistory.create({
      userId: testUser._id,
      records: [
        {
          date: new Date("2026-04-22"),
          diagnosis: "Chest pain — stress cardiomyopathy",
          hospital: "Apollo, Bandra",
          doctor: "Dr. Mehra",
          notes: "ECG normal. Prescribed rest and follow-up in 2 weeks.",
        },
        {
          date: new Date("2026-03-10"),
          diagnosis: "Knee ligament sprain",
          hospital: "Fortis, Mulund",
          doctor: "Dr. Kapoor",
          notes: "MRI recommended. Physiotherapy for 4 weeks.",
        },
        {
          date: new Date("2025-12-05"),
          diagnosis: "Routine health check-up",
          hospital: "Max, Saket",
          doctor: "Dr. Patel",
          notes: "All vitals normal. Cholesterol slightly elevated.",
        },
      ],
    });
    console.log("🏥 Created medical history");

    console.log("\n✅ Seed completed successfully!");
    console.log("─────────────────────────────────────");
    console.log("Test User:  test@hospital.com / password123");
    console.log("Admin User: admin@techensurex.com / admin123456");
    console.log("─────────────────────────────────────\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
