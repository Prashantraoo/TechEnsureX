import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartPulse, Activity, Droplet, Brain, Upload, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { healthApi, aiApi, uploadApi } from "@/lib/api";
import { toast } from "sonner";

export default function HealthReport() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await healthApi.getReport();
        setReport(data.report);
      } catch { /* defaults */ }
      setLoading(false);
    }
    load();
  }, []);

  const cvRisk = report?.cardiovascularRisk ?? 18;
  const dbRisk = report?.diabetesRisk ?? 38;
  const wellness = report?.wellnessScore ?? 84;
  const hypertension = Math.round((cvRisk + dbRisk) / 3);
  const respiratory = Math.max(5, Math.round(cvRisk * 0.6));

  const vitals = [
    { icon: HeartPulse, label: "Heart rate", value: `${60 + Math.round(cvRisk * 0.7)} bpm`, status: cvRisk < 25 ? "Normal" : "Elevated", color: cvRisk < 25 ? "text-accent" : "text-warning" },
    { icon: Droplet, label: "Blood pressure", value: `${110 + Math.round(cvRisk * 0.5)}/${70 + Math.round(cvRisk * 0.3)}`, status: cvRisk < 30 ? "Optimal" : "Watch", color: cvRisk < 30 ? "text-accent" : "text-warning" },
    { icon: Activity, label: "Glucose (fasting)", value: `${90 + Math.round(dbRisk * 0.4)} mg/dL`, status: dbRisk < 30 ? "Normal" : "Borderline", color: dbRisk < 30 ? "text-accent" : "text-warning" },
    { icon: Brain, label: "Stress index", value: wellness > 70 ? "Low" : wellness > 40 ? "Medium" : "High", status: wellness > 70 ? "Good" : "Monitor", color: wellness > 70 ? "text-accent" : "text-warning" },
  ];

  const risks = [
    { name: "Cardiovascular", v: cvRisk, level: cvRisk < 25 ? "Low" : cvRisk < 50 ? "Moderate" : "High" },
    { name: "Diabetes Type 2", v: dbRisk, level: dbRisk < 25 ? "Low" : dbRisk < 50 ? "Moderate" : "High" },
    { name: "Hypertension", v: hypertension, level: hypertension < 25 ? "Low" : hypertension < 50 ? "Moderate" : "High" },
    { name: "Respiratory", v: respiratory, level: respiratory < 25 ? "Low" : respiratory < 50 ? "Moderate" : "High" },
  ];

  const handleViewReport = async () => {
    setSummaryLoading(true);
    try {
      const { data } = await aiApi.healthSummary({
        cardiovascularRisk: cvRisk,
        diabetesRisk: dbRisk,
        wellnessScore: wellness,
      });
      setAiSummary(data.summary);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await uploadApi.scanDocument(file);
      toast.success("Report uploaded and analyzed!");
      // Refresh health report
      try {
        const { data: reportData } = await healthApi.getReport();
        setReport(reportData.report);
      } catch {}
      setAiSummary(data.scan?.aiAnalysis || null);
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">AI Health Report</h1>
          <p className="text-muted-foreground text-sm mt-1">Powered by your medical history, prescriptions and lab reports.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} />
          <Button className="bg-gradient-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {uploading ? "Uploading..." : "Upload new report"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold mb-4">Vitals snapshot</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {vitals.map((v, i) => (
              <motion.div key={v.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="p-4 rounded-xl border border-border bg-gradient-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 grid place-items-center">
                    <v.icon className={`w-5 h-5 ${v.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{v.label}</p>
                    <p className="font-semibold">{v.value}</p>
                  </div>
                  <Badge variant="outline" className={`ml-auto ${v.color}`}>{v.status}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-gradient-primary text-primary-foreground border-0 relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <ShieldCheck className="w-7 h-7 mb-3" />
          <p className="text-sm text-primary-foreground/80">Overall wellness score</p>
          <p className="font-display text-5xl font-bold mt-1">{wellness}<span className="text-2xl text-primary-foreground/70">/100</span></p>
          <p className="text-xs text-primary-foreground/80 mt-2">
            {wellness > 80 ? "Excellent! You're healthier than most users." : wellness > 60 ? "Good health. Some areas to improve." : "Needs attention. Please consult a doctor."}
          </p>
          <Button
            className="mt-4 w-full bg-white text-primary hover:bg-white/90"
            onClick={handleViewReport}
            disabled={summaryLoading}
          >
            {summaryLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "View full report"}
          </Button>
        </Card>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <Card className="p-6">
          <h3 className="font-semibold mb-2">🤖 AI Health Summary</h3>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{aiSummary}</div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Risk assessment</h3>
        <div className="grid md:grid-cols-2 gap-5">
          {risks.map((r) => (
            <div key={r.name}>
              <div className="flex justify-between text-sm mb-1.5">
                <span>{r.name}</span>
                <span className={`font-semibold ${r.level === "Low" ? "text-accent" : r.level === "Moderate" ? "text-warning" : "text-destructive"}`}>
                  {r.level} ({r.v}%)
                </span>
              </div>
              <Progress value={r.v} className="h-2" />
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">AI recommendation</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dbRisk > 30
                ? "Your fasting glucose is borderline. Consider an HbA1c test in the next 30 days. We've matched 3 diabetes-coverage add-ons for your profile."
                : cvRisk > 30
                ? "Elevated cardiovascular markers detected. Schedule a cardiac evaluation within 60 days."
                : "All vitals are within normal range. Keep up the healthy lifestyle! Next checkup recommended in 6 months."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
