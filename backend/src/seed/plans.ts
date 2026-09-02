// ─── Insurance plan catalog ─────────────────────────────
// The plans the product ships with, kept here rather than inline in
// seed.ts so the full (destructive) demo seed and the additive
// plans-only seeder both write exactly the same catalog. `name` is the
// natural key both use — see seed-plans.ts.
//
// These back two features at once: the Insurance Plans page, and RAG
// grounding for chat (rag.service.ts chunks and embeds them, which is
// what lets EnsureAI answer plan-specific questions). An empty
// InsurancePlan collection silently disables both, with no error
// anywhere — the page just renders nothing and chat quietly loses its
// policy grounding.

export interface SeedInsurancePlan {
  name: string;
  insurer: string;
  premium: number;
  cover: string;
  rating: number;
  popular: boolean;
  features: string[];
}

export const INSURANCE_PLANS: SeedInsurancePlan[] = [
  {
    name: "Star Health Family Optima",
    insurer: "Star Health",
    premium: 18400,
    cover: "₹10 L",
    rating: 4.7,
    popular: true,
    features: [
      "Cashless at 12,000+ hospitals",
      "Pre/post hospitalization",
      "Day-care procedures",
      "No room rent capping",
    ],
  },
  {
    name: "HDFC Ergo my:health Suraksha",
    insurer: "HDFC Ergo",
    premium: 14200,
    cover: "₹7.5 L",
    rating: 4.5,
    popular: false,
    features: [
      "Restoration benefit",
      "Worldwide emergency cover",
      "Health check-ups",
      "Maternity add-on",
    ],
  },
  {
    name: "ICICI Lombard Complete Health",
    insurer: "ICICI Lombard",
    premium: 21500,
    cover: "₹15 L",
    rating: 4.6,
    popular: false,
    features: [
      "AYUSH treatment",
      "Wellness rewards",
      "Global coverage",
      "Critical illness rider",
    ],
  },
  {
    name: "Max Bupa ReAssure 2.0",
    insurer: "Niva Bupa",
    premium: 16800,
    cover: "₹10 L",
    rating: 4.4,
    popular: false,
    features: [
      "Refill benefit",
      "ReAssure for life",
      "Live healthy discount",
      "Booster benefit",
    ],
  },
];
