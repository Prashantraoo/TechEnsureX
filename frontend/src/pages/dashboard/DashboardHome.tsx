import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  UploadCloud, FileScan, Sparkles, Loader2, Clock, Inbox, CalendarDays,
  Wallet, CheckCircle2, Timer, XCircle, ShieldCheck, ArrowRight, ChevronDown, HeartPulse,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { RadialGauge } from "@/components/shared/RadialGauge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useState, useEffect, useRef } from "react";
import { getCurrentUser, AuthUser } from "@/lib/auth";
import { claimsApi, healthApi, uploadApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const EASE = [0.23, 1, 0.32, 1] as const;

const monthly = [
  { m: "Jan", claims: 18, approved: 16 }, { m: "Feb", claims: 24, approved: 22 },
  { m: "Mar", claims: 32, approved: 30 }, { m: "Apr", claims: 28, approved: 25 },
  { m: "May", claims: 41, approved: 38 }, { m: "Jun", claims: 36, approved: 34 },
  { m: "Jul", claims: 52, approved: 49 }, { m: "Aug", claims: 47, approved: 45 },
];

const expenses = [
  { m: "Jan", v: 12000 }, { m: "Feb", v: 18500 }, { m: "Mar", v: 22000 },
  { m: "Apr", v: 14000 }, { m: "May", v: 31000 }, { m: "Jun", v: 25000 },
];

/** % change, rounded, or null when there's no prior-period data to compare against — never a fabricated trend. */
function periodChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export default function DashboardHome() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [claimsData, setClaimsData] = useState<any[]>([]);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const u = await getCurrentUser();
      setUser(u);

      try {
        const { data } = await claimsApi.getAll();
        setClaimsData(data.claims || []);
      } catch { /* backend may not be connected */ }

      try {
        const { data } = await healthApi.getReport();
        setHealthReport(data.report);
      } catch { /* use defaults */ }
    }
    load();
  }, []);

  const totalClaims = claimsData.length;
  const approvedClaims = claimsData.filter((c: any) => c.status === "Approved").length;
  const rejectedClaims = claimsData.filter((c: any) => c.status === "Rejected").length;
  const pendingClaims = claimsData.filter((c: any) => c.status !== "Approved" && c.status !== "Rejected").length;
  const successRate = totalClaims > 0 ? ((approvedClaims / totalClaims) * 100).toFixed(1) : "0";
  const totalAmount = claimsData.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  // Real period-over-period comparison (last 90 days vs the 90 before that),
  // derived from actual claim dates — never a placeholder percentage.
  const now = Date.now();
  const DAY = 86400000;
  const inWindow = (c: any, startDaysAgo: number, endDaysAgo: number) => {
    const t = c.date ? new Date(c.date).getTime() : NaN;
    if (Number.isNaN(t)) return false;
    const ageDays = (now - t) / DAY;
    return ageDays >= endDaysAgo && ageDays < startDaysAgo;
  };
  const current90 = claimsData.filter((c) => inWindow(c, 90, 0));
  const prior90 = claimsData.filter((c) => inWindow(c, 180, 90));
  const trendFor = (status: string | null) => {
    const cur = status ? current90.filter((c: any) => c.status === status).length : current90.length;
    const prev = status ? prior90.filter((c: any) => c.status === status).length : prior90.length;
    return periodChange(cur, prev);
  };
  const amountTrend = periodChange(
    current90.reduce((s: number, c: any) => s + (c.amount || 0), 0),
    prior90.reduce((s: number, c: any) => s + (c.amount || 0), 0),
  );
  const pendingTrend = (() => {
    const cur = current90.filter((c: any) => c.status !== "Approved" && c.status !== "Rejected").length;
    const prev = prior90.filter((c: any) => c.status !== "Approved" && c.status !== "Rejected").length;
    return periodChange(cur, prev);
  })();
  const fmtTrend = (v: number | null) => (v === null ? undefined : `${v > 0 ? "+" : ""}${v}%`);
  const trendDir = (v: number | null): "up" | "down" | undefined => (v === null ? undefined : v >= 0 ? "up" : "down");

  const breakdown = [
    { name: "Approved", value: approvedClaims || 1, color: "hsl(var(--success))" },
    { name: "Processing", value: claimsData.filter((c: any) => c.status === "Processing").length || 1, color: "hsl(var(--primary))" },
    { name: "AI Verification", value: claimsData.filter((c: any) => c.status === "AI Verification").length || 0, color: "hsl(var(--info))" },
    { name: "Rejected", value: rejectedClaims || 0, color: "hsl(var(--destructive))" },
  ].filter(b => b.value > 0);
  const breakdownTotal = breakdown.reduce((s, b) => s + b.value, 0);

  // null until the user has a real health report on file — never a
  // fabricated number just to keep these tiles populated.
  const cvRisk: number | null = healthReport?.cardiovascularRisk ?? null;
  const dbRisk: number | null = healthReport?.diabetesRisk ?? null;
  const wellness: number | null = healthReport?.wellnessScore ?? null;
  const hasHealthReport = cvRisk !== null && dbRisk !== null && wellness !== null;
  const riskStatus = (v: number) => (v < 25 ? "Low" : v < 50 ? "Moderate" : "High");
  const wellnessStatus = (v: number) => (v >= 80 ? "Good" : v >= 60 ? "Fair" : "Needs attention");

  const runScan = async (file: File) => {
    setScanning(true);
    setScanResult(null);
    try {
      const { data } = await uploadApi.scanDocument(file);
      setScanResult(data.scan?.aiAnalysis || "Analysis complete.");
      toast.success("Document scanned successfully!");
    } catch (err: any) {
      toast.error(err.message || "Scan failed.");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runScan(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) runScan(file);
  };

  const rangeLabel = `Jan 1 – ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Welcome back, ${user?.name || "there"} 👋`}
        title="Your insurance overview"
        actions={
          <span className="inline-flex items-center gap-2 h-9 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4 shrink-0" />
            {rangeLabel}
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
          </span>
        }
      />

      {/* Primary analytics workspace — the year's claims number and its
          trend live in one surface with the chart that explains it, not a
          stat card floating next to an unrelated chart card. Flat surface,
          no gradient wash. */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
        <Card className="p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8">
            <div className="lg:w-56 shrink-0 flex flex-col justify-between">
              <div className="flex items-start gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Claims this year</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="font-display text-5xl font-bold tracking-tight">{totalClaims}</p>
                    {fmtTrend(trendFor(null)) && (
                      <span className={cn(
                        "text-xs font-medium rounded-full px-1.5 py-0.5",
                        trendDir(trendFor(null)) === "up" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                      )}>
                        {fmtTrend(trendFor(null))}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">vs last year</p>
                </div>
                <RadialGauge value={Number(successRate)} tone="success" label="Approval rate" className="mt-1" />
              </div>
              <p className="text-xs text-muted-foreground mt-6 lg:mt-0">Approval rate · submissions vs. approvals, last 8 months</p>
            </div>
            <div className="flex-1 min-w-0 lg:border-l lg:border-border lg:pl-8">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Submissions</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> Approvals</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
                  Monthly <ChevronDown className="w-3 h-3" />
                </span>
              </div>
              <ResponsiveContainer width="100%" height={205}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "var(--shadow-hover)" }} />
                  <Area type="monotone" dataKey="claims" name="Submissions" stroke="hsl(var(--primary))" fill="url(#c1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="approved" name="Approvals" stroke="hsl(var(--success))" fill="url(#c2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Real-data insight strip — pulls from the same health report and
              claims state already loaded on this page, never a fabricated
              number. A quiet capability, not a visual "AI" moment. */}
          <div className="mt-5 flex items-center gap-2.5 text-xs text-muted-foreground bg-primary/5 rounded-lg px-4 py-3">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              {hasHealthReport && <>Insight — wellness score <span className="font-semibold text-foreground">{wellness}/100</span>, </>}
              {pendingClaims > 0
                ? `${pendingClaims} claim${pendingClaims > 1 ? "s" : ""} awaiting review.`
                : "all claims resolved."}
            </span>
          </div>
        </Card>
      </motion.div>

      {/* Metrics strip — individual tiles so each figure can carry its own
          icon, semantic color, and period comparison; not every number is
          blue. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05, ease: EASE }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <MetricCard
          label="Total value" icon={Wallet} tone="primary"
          value={`₹${(totalAmount / 100000).toFixed(1)}L`}
          trend={fmtTrend(amountTrend)} trendDirection={trendDir(amountTrend)}
          caption="vs last period"
        />
        <MetricCard
          label="Approved" icon={CheckCircle2} tone="success"
          value={approvedClaims}
          trend={fmtTrend(trendFor("Approved"))} trendDirection={trendDir(trendFor("Approved"))}
          caption="vs last period"
        />
        <MetricCard
          label="Pending" icon={Timer} tone="warning"
          value={pendingClaims}
          trend={fmtTrend(pendingTrend)} trendDirection={trendDir(pendingTrend)}
          caption="vs last period"
        />
        <MetricCard
          label="Rejected" icon={XCircle} tone="error"
          value={rejectedClaims}
          trend={fmtTrend(trendFor("Rejected"))} trendDirection={trendDir(trendFor("Rejected"))}
          caption="vs last period"
        />
      </motion.div>

      {/* Health analytics — three peer modules: claim breakdown, health
          expenditure, and the document upload workspace. Equal weight,
          no single card dominating with a gradient fill. */}
      <div className="grid lg:grid-cols-3 gap-4 items-stretch">
        <Card className="p-5 flex flex-col">
          <h3 className="text-sm font-semibold">Claim breakdown</h3>
          <p className="text-xs text-muted-foreground mb-1">Current status</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={breakdown} dataKey="value" innerRadius={44} outerRadius={66} paddingAngle={3} strokeWidth={0}>
                {breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1 flex-1">
            {breakdown.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} /> {b.name}
                </div>
                <span className="font-medium">{b.value} <span className="text-muted-foreground">({breakdownTotal ? Math.round((b.value / breakdownTotal) * 100) : 0}%)</span></span>
              </div>
            ))}
          </div>
          <Link to="/dashboard/claims" className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-4 hover:underline">
            View all claims <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        <Card className="p-5 flex flex-col">
          <h3 className="text-sm font-semibold">Health expenditure</h3>
          <p className="text-xs text-muted-foreground mb-1">Last 6 months · ₹</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={expenses}>
              <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="v" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
          <Link to="/dashboard/billing" className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-3 hover:underline">
            View full report <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        {/* Document scan — premium white module with a teal accent line,
            never a gradient-filled "AI" card. */}
        <Card className="p-5 flex flex-col border-l-[3px] border-l-secondary">
          <h3 className="text-sm font-semibold">Document scan</h3>
          <p className="text-xs text-muted-foreground mt-1">Upload a bill or report for analysis.</p>
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileScan} />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "flex-1 min-h-[104px] mt-3 rounded-lg border-2 border-dashed grid place-items-center text-center px-3 py-4 transition-colors",
              dragActive ? "border-secondary bg-secondary/5" : "border-border bg-muted/30",
            )}
          >
            {scanning ? (
              <Loader2 className="w-5 h-5 text-secondary animate-spin" />
            ) : (
              <div className="space-y-1">
                <UploadCloud className="w-5 h-5 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">Drag & drop your file here</p>
                <p className="text-xs text-muted-foreground">or</p>
                <Button size="sm" variant="default" onClick={() => fileInputRef.current?.click()} disabled={scanning}>
                  Choose file
                </Button>
              </div>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-secondary shrink-0" /> Secure &amp; encrypted
          </p>
        </Card>
      </div>

      {/* Scan result */}
      {scanResult && (
        <Card className="p-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <FileScan className="w-4 h-4 text-primary" /> Scan results
          </h3>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{scanResult}</div>
        </Card>
      )}

      {/* Health insights strip — a professional analytics band, not a
          repeated "AI" badge. Semantic color per risk level. */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-3 lg:w-56 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary grid place-items-center shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Health insights</h3>
              <p className="text-xs text-muted-foreground">Based on your latest reports</p>
            </div>
          </div>
          {hasHealthReport ? (
            <div className="flex-1 grid sm:grid-cols-3 gap-6">
              {[
                { l: "Cardiovascular risk", v: cvRisk, status: riskStatus(cvRisk), bar: cvRisk < 25 ? "bg-success" : cvRisk < 50 ? "bg-warning" : "bg-destructive", text: cvRisk < 25 ? "text-success" : cvRisk < 50 ? "text-warning" : "text-destructive" },
                { l: "Diabetes risk", v: dbRisk, status: riskStatus(dbRisk), bar: dbRisk < 25 ? "bg-success" : dbRisk < 50 ? "bg-warning" : "bg-destructive", text: dbRisk < 25 ? "text-success" : dbRisk < 50 ? "text-warning" : "text-destructive" },
                { l: "Wellness score", v: wellness, status: wellnessStatus(wellness), bar: wellness >= 80 ? "bg-success" : wellness >= 60 ? "bg-warning" : "bg-destructive", text: wellness >= 80 ? "text-success" : wellness >= 60 ? "text-warning" : "text-destructive" },
              ].map((m) => (
                <div key={m.l}>
                  <div className="flex items-baseline justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">{m.l}</span>
                    <span className="font-semibold text-foreground">{m.v}%</span>
                  </div>
                  <Progress value={m.v} className="h-1.5" indicatorClassName={m.bar} />
                  <p className={cn("text-xs mt-1 font-medium", m.text)}>{m.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1">
              <EmptyState icon={HeartPulse} title="No health report yet" description="Upload a medical report to see your risk and wellness insights here." />
            </div>
          )}
          <Button variant="outline" size="sm" asChild className="shrink-0 self-start lg:self-center">
            <Link to="/dashboard/health-report">
              {hasHealthReport ? "View full report" : "Upload a report"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </Card>

      {/* Recent activity — real claims data, not a mocked feed. */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" /> Recent activity
        </h3>
        {claimsData.length === 0 ? (
          <EmptyState icon={Inbox} title="No claims yet" className="py-6" />
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {[...claimsData]
              .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
              .slice(0, 4)
              .map((c: any) => (
                <li key={c._id || c.claimId} className="flex items-center justify-between gap-3 text-sm py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.hospital || c.claimId}</p>
                    <p className="text-xs text-muted-foreground">{c.date ? new Date(c.date).toLocaleDateString() : "—"}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
