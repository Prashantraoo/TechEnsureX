import { motion } from "framer-motion";
import { TrendingUp, FileText, ShieldCheck, Clock, Activity, Upload, FileScan, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import { getCurrentUser, AuthUser } from "@/lib/auth";
import { claimsApi, healthApi, uploadApi } from "@/lib/api";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

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

export default function DashboardHome() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [claimsData, setClaimsData] = useState<any[]>([]);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
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
  const pendingClaims = claimsData.filter((c: any) => c.status !== "Approved" && c.status !== "Rejected").length;
  const successRate = totalClaims > 0 ? ((approvedClaims / totalClaims) * 100).toFixed(1) : "0";
  const totalAmount = claimsData.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  const stats = [
    { icon: FileText, label: "Total Claims", value: totalClaims > 0 ? totalClaims.toString() : "0", trend: totalClaims > 0 ? `+${totalClaims}` : "New", color: "text-primary", bg: "bg-primary/10" },
    { icon: ShieldCheck, label: "Success Rate", value: `${successRate}%`, trend: approvedClaims > 0 ? `${approvedClaims} approved` : "—", color: "text-accent", bg: "bg-accent/10" },
    { icon: Activity, label: "Total Amount", value: `₹${(totalAmount / 100000).toFixed(1)}L`, trend: "All claims", color: "text-secondary", bg: "bg-secondary/10" },
    { icon: Clock, label: "Pending Claims", value: pendingClaims.toString(), trend: pendingClaims > 0 ? "In progress" : "All clear", color: "text-warning", bg: "bg-warning/10" },
  ];

  const breakdown = [
    { name: "Approved", value: approvedClaims || 1, color: "hsl(var(--accent))" },
    { name: "Processing", value: claimsData.filter((c: any) => c.status === "Processing").length || 1, color: "hsl(var(--primary))" },
    { name: "AI Verification", value: claimsData.filter((c: any) => c.status === "AI Verification").length || 0, color: "hsl(var(--warning))" },
    { name: "Rejected", value: claimsData.filter((c: any) => c.status === "Rejected").length || 0, color: "hsl(var(--destructive))" },
  ].filter(b => b.value > 0);

  const cvRisk = healthReport?.cardiovascularRisk ?? 18;
  const dbRisk = healthReport?.diabetesRisk ?? 32;
  const wellness = healthReport?.wellnessScore ?? 84;

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back, {user?.name || "Loading..."} 👋</p>
        <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Your insurance overview</h1>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="p-5 hover-lift bg-gradient-card border-border">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${s.bg} grid place-items-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <Badge variant="secondary" className="text-xs">{s.trend}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-4">{s.label}</p>
              <p className="font-display text-2xl font-bold mt-1">{s.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Monthly claims</h3>
              <p className="text-xs text-muted-foreground">Submissions vs approvals</p>
            </div>
            <Badge variant="outline" className="gap-1"><TrendingUp className="w-3 h-3" /> Trending up</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Area type="monotone" dataKey="claims" stroke="hsl(var(--primary))" fill="url(#c1)" strokeWidth={2} />
              <Area type="monotone" dataKey="approved" stroke="hsl(var(--accent))" fill="url(#c2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold">Claim breakdown</h3>
          <p className="text-xs text-muted-foreground mb-2">Current status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={breakdown} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {breakdown.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} /> {b.name}
                </div>
                <span className="font-semibold">{b.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold mb-1">Health expenditure</h3>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months · ₹</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={expenses}>
              <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="v" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* AI Upload — FUNCTIONAL */}
        <Card className="p-6 bg-gradient-primary text-primary-foreground border-0 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <Sparkles className="w-6 h-6 mb-3" />
          <h3 className="font-display font-bold text-lg">AI Document Scan</h3>
          <p className="text-sm text-primary-foreground/80 mt-1">Upload your medical bill or report — get risk scoring, coverage match and fraud check in seconds.</p>
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileScan} />
          <div
            className="mt-4 border-2 border-dashed border-white/30 rounded-xl p-5 text-center cursor-pointer hover:border-white/60 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {scanning ? <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" /> : <Upload className="w-6 h-6 mx-auto mb-2" />}
            <p className="text-xs">{scanning ? "Scanning document..." : "Drag & drop · PDF, JPG, PNG"}</p>
          </div>
          <Button
            className="w-full mt-4 bg-white text-primary hover:bg-white/90"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
          >
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileScan className="w-4 h-4 mr-2" />}
            {scanning ? "Scanning..." : "Choose file"}
          </Button>
        </Card>
      </div>

      {/* Scan result */}
      {scanResult && (
        <Card className="p-6">
          <h3 className="font-semibold mb-2">📄 AI Scan Results</h3>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{scanResult}</div>
        </Card>
      )}

      {/* Health insights */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">AI health insights</h3>
            <p className="text-xs text-muted-foreground">Based on your latest reports</p>
          </div>
          <Badge className="bg-accent/15 text-accent hover:bg-accent/15">Live</Badge>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { l: "Cardiovascular risk", v: cvRisk, color: "bg-accent" },
            { l: "Diabetes risk", v: dbRisk, color: "bg-warning" },
            { l: "Wellness score", v: wellness, color: "bg-primary" },
          ].map((m) => (
            <div key={m.l}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">{m.l}</span>
                <span className="font-semibold">{m.v}%</span>
              </div>
              <Progress value={m.v} className="h-2" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
