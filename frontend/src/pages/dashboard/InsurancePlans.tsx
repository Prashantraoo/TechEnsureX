import { motion, AnimatePresence } from "framer-motion";
import { Fragment, useState, useEffect } from "react";
import { plansApi } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Star, Check, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.23, 1, 0.32, 1] as const;

interface Plan {
  name: string;
  insurer: string;
  premium: number;
  cover: string;
  rating: number;
  features: string[];
  badge?: "Recommended" | "Best value" | "Best coverage";
}

const fallbackPlans: Plan[] = [
  { name: "Star Health Family Optima", insurer: "Star Health", premium: 18400, cover: "₹10 L", rating: 4.7, badge: "Recommended",
    features: ["Cashless at 12,000+ hospitals", "Pre/post hospitalization", "Day-care procedures", "No room rent capping"] },
  { name: "HDFC Ergo my:health Suraksha", insurer: "HDFC Ergo", premium: 14200, cover: "₹7.5 L", rating: 4.5, badge: "Best value",
    features: ["Restoration benefit", "Worldwide emergency cover", "Health check-ups", "Maternity add-on"] },
  { name: "ICICI Lombard Complete Health", insurer: "ICICI Lombard", premium: 21500, cover: "₹15 L", rating: 4.6, badge: "Best coverage",
    features: ["AYUSH treatment", "Wellness rewards", "Global coverage", "Critical illness rider"] },
  { name: "Max Bupa ReAssure 2.0", insurer: "Niva Bupa", premium: 16800, cover: "₹10 L", rating: 4.4,
    features: ["Refill benefit", "ReAssure for life", "Live healthy discount", "Booster benefit"] },
];

/** "₹10 L" / "₹7.5 L" → 10 / 7.5, for the relative coverage indicator. */
function parseCoverLakhs(cover: string): number {
  const match = cover.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export default function InsurancePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

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
    toast.success(`Request submitted for "${planName}". Our team will contact you within 24 hours.`);
  };

  const maxCover = Math.max(1, ...plans.map((p) => parseCoverLakhs(p.cover)));
  const featured = plans.find((p) => p.badge === "Recommended");
  const rest = featured ? plans.filter((p) => p !== featured) : plans;

  return (
    <div className="space-y-6">
      <PageHeader title="Insurance Plans" description="AI-matched recommendations based on your profile — compare premium, coverage and benefits side by side." />

      {loading ? (
        <LoadingState variant="table" rows={4} />
      ) : (
        <>
          {/* Featured plan — pulled out of the table entirely so the
              recommendation reads as a genuine standout moment, not just a
              tinted row among equals. This is the page's one "AI/primary"
              glow moment. */}
          {featured && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <div className="relative rounded-2xl border border-primary/20 bg-card p-6 sm:p-7 shadow-soft overflow-hidden">
                <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10 mb-2.5">
                      <Sparkles className="w-3 h-3 mr-1" /> Recommended for you
                    </Badge>
                    <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{featured.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      {featured.insurer}
                      <span className="inline-flex items-center gap-1 ml-1">
                        <Star className="w-3.5 h-3.5 fill-warning text-warning" /> {featured.rating}
                      </span>
                    </p>
                    <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 max-w-lg">
                      {featured.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                          <Check className="w-4 h-4 mt-0.5 text-success shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="lg:w-56 shrink-0 lg:border-l lg:border-border/60 lg:pl-7 flex flex-row lg:flex-col gap-6 lg:gap-4 items-end lg:items-stretch justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Premium / yr</p>
                      <p className="font-display text-3xl font-bold tracking-tight">₹{featured.premium.toLocaleString()}</p>
                    </div>
                    <div className="text-right lg:text-left">
                      <p className="text-xs text-muted-foreground mb-1.5">Sum insured · {featured.cover}</p>
                      <div className="h-1.5 w-28 rounded-full bg-muted overflow-hidden ml-auto lg:ml-0">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (parseCoverLakhs(featured.cover) / maxCover) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <Button size="lg" className="shrink-0 lg:w-full" onClick={() => handleBuy(featured.name)}>
                      Buy now
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {rest.length > 0 && (
            <div>
              {featured && <p className="text-sm font-semibold text-muted-foreground mb-3">Compare more plans</p>}
              <div className="rounded-xl border border-border/70 shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[220px]">Plan</TableHead>
                        <TableHead>Premium / yr</TableHead>
                        <TableHead>Sum insured</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rest.map((p, i) => {
                  const isOpen = expanded === p.name;
                  return (
                    <Fragment key={p.name || i}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.04 }}
                      className={cn(
                        "border-b border-border last:border-0 align-top transition-colors duration-150 hover:bg-muted/40",
                        isOpen && "border-b-0",
                      )}
                    >
                      <TableCell>
                        {p.badge && (
                          <Badge variant="outline" className="mb-1.5 text-[11px] font-medium border-border text-muted-foreground">
                            {p.badge}
                          </Badge>
                        )}
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.insurer}</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-display text-lg font-bold">₹{p.premium.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span>{p.cover}</span>
                        <div className="mt-1.5 h-1 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-secondary"
                            style={{ width: `${Math.min(100, (parseCoverLakhs(p.cover) / maxCover) * 100)}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Star className="w-3.5 h-3.5 fill-warning text-warning" /> {p.rating}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(isOpen ? null : p.name)}
                            aria-expanded={isOpen}
                          >
                            Details <ChevronDown className={cn("w-3.5 h-3.5 ml-1 transition-transform duration-200", isOpen && "rotate-180")} />
                          </Button>
                          <Button size="sm" onClick={() => handleBuy(p.name)}>
                            Buy now
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="bg-muted/30 border-b border-border last:border-0"
                        >
                          <TableCell colSpan={5} className="py-4">
                            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 max-w-2xl">
                              {p.features.map((f) => (
                                <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                                  <Check className="w-4 h-4 mt-0.5 text-success shrink-0" /> {f}
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                    </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
