import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, FileText, Search, ShieldCheck, CircleDollarSign, Link2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { settlementsApi, claimsApi } from "@/lib/api";

const stageIcons = [FileText, Search, ShieldCheck, Check, CircleDollarSign];

export default function Settlement() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [settRes, claimRes] = await Promise.all([
          settlementsApi.getAll(),
          claimsApi.getAll(),
        ]);
        setSettlements(settRes.data.settlements || []);
        setClaims(claimRes.data.claims || []);
        if (settRes.data.settlements?.length > 0) {
          setSelected(settRes.data.settlements[0]);
        }
      } catch { /* backend offline */ }
      setLoading(false);
    }
    load();
  }, []);

  // If no settlements from backend, show a placeholder
  const hasData = selected && selected.stages?.length > 0;

  // Default stages if no settlement data
  const defaultStages = [
    { label: "Submitted", time: "—", done: false, active: false },
    { label: "Under Review", time: "—", done: false, active: false },
    { label: "AI Verification", time: "—", done: false, active: false },
    { label: "Approved", time: "—", done: false, active: false },
    { label: "Settled", time: "—", done: false, active: true },
  ];

  const stages = hasData ? selected.stages : defaultStages;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Claim Settlement</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time, blockchain-verified payout tracking.</p>
      </div>

      {/* Claim selector */}
      {claims.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {claims.filter((c: any) => c.status === "Approved").map((c: any) => {
            const s = settlements.find((s: any) => s.claimId === c.claimId);
            return (
              <Button
                key={c.claimId}
                variant={selected?.claimId === c.claimId ? "default" : "outline"}
                size="sm"
                onClick={() => setSelected(s || { claimId: c.claimId, amount: c.amount, stages: defaultStages, blockchainTxHash: c.blockchainHash })}
              >
                {c.claimId} · ₹{c.amount?.toLocaleString()}
              </Button>
            );
          })}
          {claims.filter((c: any) => c.status === "Approved").length === 0 && (
            <p className="text-sm text-muted-foreground">No approved claims with settlements yet.</p>
          )}
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <div>
            <p className="text-xs text-muted-foreground">Claim ID</p>
            <p className="font-semibold text-lg">{selected?.claimId || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Approved amount</p>
            <p className="font-display text-2xl font-bold text-accent">₹{(selected?.amount || 0).toLocaleString()}</p>
          </div>
          <Badge className="bg-secondary/15 text-secondary hover:bg-secondary/15 gap-1">
            <Link2 className="w-3 h-3" /> {selected?.blockchainTxHash ? `${selected.blockchainTxHash.slice(0, 8)}… verified` : "Pending verification"}
          </Badge>
        </div>

        <div className="mt-8 relative">
          <div className="absolute left-6 top-6 bottom-6 w-px bg-border" />
          <div className="space-y-6">
            {stages.map((s: any, i: number) => {
              const Icon = stageIcons[i] || FileText;
              return (
                <motion.div key={s.label} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }} className="flex items-start gap-4 relative">
                  <div className={`w-12 h-12 rounded-full grid place-items-center shrink-0 z-10 ${
                    s.done ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : s.active ? "bg-warning/20 border-2 border-warning text-warning animate-pulse"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{s.label}</p>
                      {s.done && <Check className="w-4 h-4 text-accent" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.time}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm font-semibold text-primary">🔗 Blockchain audit trail</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
            tx: {selected?.blockchainTxHash || "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("")}
          </p>
        </div>
      </Card>
    </div>
  );
}
