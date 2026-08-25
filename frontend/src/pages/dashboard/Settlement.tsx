import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { useState, useEffect } from "react";
import { settlementsApi, claimsApi } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Timeline, type TimelineStep } from "@/components/shared/Timeline";

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
  const timelineSteps: TimelineStep[] = stages.map((s: any) => ({
    label: s.label,
    timestamp: s.time !== "—" ? s.time : undefined,
    state: s.done ? "complete" : s.active ? "current" : "upcoming",
  }));

  if (loading) {
    return <LoadingState variant="spinner" className="py-20" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Claim Settlement" description="Real-time, verified payout tracking." />

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

        <div className="mt-8">
          <Timeline steps={timelineSteps} orientation="horizontal" />
        </div>

        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm font-semibold text-primary flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5" /> Secure audit trail
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
            {selected?.blockchainTxHash ? `ref: ${selected.blockchainTxHash}` : "Not yet recorded — this settlement hasn't been verified."}
          </p>
        </div>
      </Card>
    </div>
  );
}
