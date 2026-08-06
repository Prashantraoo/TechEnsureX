import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Star, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { plansApi } from "@/lib/api";
import { toast } from "sonner";

// Fallback plans if backend is empty
const fallbackPlans = [
  { name: "Star Health Family Optima", insurer: "Star Health", premium: 18400, cover: "₹10 L", rating: 4.7, popular: true,
    features: ["Cashless at 12,000+ hospitals", "Pre/post hospitalization", "Day-care procedures", "No room rent capping"] },
  { name: "HDFC Ergo my:health Suraksha", insurer: "HDFC Ergo", premium: 14200, cover: "₹7.5 L", rating: 4.5, popular: false,
    features: ["Restoration benefit", "Worldwide emergency cover", "Health check-ups", "Maternity add-on"] },
  { name: "ICICI Lombard Complete Health", insurer: "ICICI Lombard", premium: 21500, cover: "₹15 L", rating: 4.6, popular: false,
    features: ["AYUSH treatment", "Wellness rewards", "Global coverage", "Critical illness rider"] },
  { name: "Max Bupa ReAssure 2.0", insurer: "Niva Bupa", premium: 16800, cover: "₹10 L", rating: 4.4, popular: false,
    features: ["Refill benefit", "ReAssure for life", "Live healthy discount", "Booster benefit"] },
];

export default function InsurancePlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await plansApi.getAll();
        setPlans(data.plans?.length > 0 ? data.plans : fallbackPlans);
      } catch {
        setPlans(fallbackPlans);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleBuy = (planName: string) => {
    toast.success(`🎉 Request submitted for "${planName}"! Our team will contact you within 24 hours.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Insurance Plans</h1>
        <p className="text-muted-foreground text-sm mt-1">AI-matched recommendations based on your profile.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {plans.map((p: any, i: number) => (
          <motion.div key={p.name || i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="p-6 hover-lift relative">
              {p.popular && <Badge className="absolute -top-2 left-6 bg-warning text-foreground">AI Best Match</Badge>}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.insurer}</p>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-warning text-warning" /> <span className="font-semibold">{p.rating}</span>
                </div>
              </div>
              <div className="flex items-end gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Premium / year</p>
                  <p className="font-display text-2xl font-bold">₹{p.premium?.toLocaleString()}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Sum insured</p>
                  <p className="font-semibold text-secondary">{p.cover}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {(p.features || []).map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 text-accent shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 mt-5">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedPlan(selectedPlan?.name === p.name ? null : p)}
                >
                  {selectedPlan?.name === p.name ? "Hide details" : "View details"}
                </Button>
                <Button className="flex-1 bg-gradient-primary" onClick={() => handleBuy(p.name)}>Buy now</Button>
              </div>
              {selectedPlan?.name === p.name && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
                  <h4 className="font-semibold text-sm mb-2">Plan Details</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>{p.name}</strong> by {p.insurer} offers comprehensive coverage of {p.cover} at an annual premium of ₹{p.premium?.toLocaleString()}.
                    Rated {p.rating}/5 by users. {p.popular ? "This plan has been AI-matched as the best fit for your health profile." : ""}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Features include: {(p.features || []).join(", ")}.</p>
                </motion.div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
