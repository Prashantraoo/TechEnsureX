import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartPulse, Activity, Droplet, Upload, AlertTriangle, ShieldCheck, Loader2, Bot, FileText, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { uploadApi } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

type FindingStatus = "normal" | "high" | "low" | "abnormal" | "unknown";

interface DocumentAnalysisResult {
  documentSummary: string;
  patientDetails: { name: string; age: string; sex: string; reportDate: string };
  keyFindings: Array<{ finding: string; value: string; status: FindingStatus }>;
  medications: string[];
  diagnoses: string[];
  labResults: Array<{ test: string; value: string; unit: string; referenceRange: string; status: FindingStatus }>;
  riskScore: { score: number; reasoning: string };
  recommendations: string[];
  disclaimer: string;
}

type UploadStage = "idle" | "uploading" | "extracting" | "analyzing";

function statusTone(status: FindingStatus): string {
  switch (status) {
    case "high":
    case "abnormal":
      return "text-destructive border-destructive/30";
    case "low":
      return "text-warning border-warning/30";
    case "normal":
      return "text-accent border-accent/30";
    default:
      return "text-muted-foreground border-border";
  }
}

function statusLabel(status: FindingStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Vitals aren't a distinct structured field the backend returns — they're
// whatever the report's own lab table happens to contain. We look for a
// matching row by test name rather than inventing a value, and show "Not
// available in report" when a report genuinely doesn't include that test.
type VitalDef = { icon: typeof HeartPulse; label: string; match: RegExp };
const VITAL_DEFS: VitalDef[] = [
  { icon: HeartPulse, label: "Heart rate", match: /heart\s*rate|pulse/i },
  { icon: Droplet, label: "Blood pressure", match: /blood\s*pressure|\bbp\b/i },
  { icon: Activity, label: "Glucose", match: /glucose|blood\s*sugar/i },
];

function findVital(labResults: DocumentAnalysisResult["labResults"], pattern: RegExp) {
  return labResults.find((l) => pattern.test(l.test));
}

export default function HealthReport() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [analysisFileName, setAnalysisFileName] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Hydrate from the most recently uploaded/analyzed report so refreshing
  // the page doesn't blank out real data the user already has.
  useEffect(() => {
    async function load() {
      try {
        const { data } = await uploadApi.getScans();
        const latest = data.scans?.[0];
        if (latest?.analysis) {
          setAnalysis(latest.analysis as DocumentAnalysisResult);
          setAnalysisFileName(latest.fileName ?? null);
        }
      } catch {
        /* no prior scans yet — not an error state */
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAnalysisError(null);
    setAnalysis(null);
    setUploadStage("uploading");

    // The upload is a single request/response — the backend doesn't stream
    // stage events back — so "extracting" / "analyzing" are shown on a
    // timer rather than pushed from the server. This is still honest:
    // extraction really is the fast part (well under a second for a
    // normal-sized report) and "Analyzing with AI..." stays on screen for
    // the genuinely long part of the wait (Nemotron can take 30-90s+).
    const toExtracting = setTimeout(() => setUploadStage("extracting"), 300);
    const toAnalyzing = setTimeout(() => setUploadStage("analyzing"), 1500);

    try {
      const { data } = await uploadApi.scanDocument(file);
      toast.success("Report uploaded and analyzed!");
      if (data.scan?.analysis) {
        setAnalysis(data.scan.analysis as DocumentAnalysisResult);
        setAnalysisFileName(data.scan.fileName || file.name);
      } else {
        // Structured analysis missing (shouldn't happen on a 201, but
        // don't silently show nothing).
        setAnalysisError("The report was processed, but no structured analysis was returned.");
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Upload failed.");
      toast.error(err.message || "Upload failed.");
    } finally {
      clearTimeout(toExtracting);
      clearTimeout(toAnalyzing);
      setUploading(false);
      setUploadStage("idle");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return <LoadingState variant="spinner" className="py-20" />;
  }

  const labResults = analysis?.labResults ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Health Report"
        description="Powered by your medical history, prescriptions and lab reports."
        actions={
          <>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} />
            <Button className="bg-gradient-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploadStage === "uploading" && "Uploading..."}
              {uploadStage === "extracting" && "Extracting report..."}
              {uploadStage === "analyzing" && "Analyzing with AI..."}
              {uploadStage === "idle" && "Upload new report"}
            </Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold mb-4">Vitals snapshot</h3>
          {analysis ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {VITAL_DEFS.map((v, i) => {
                const lab = findVital(labResults, v.match);
                const status: FindingStatus = lab?.status ?? "unknown";
                return (
                  <motion.div key={v.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="p-4 rounded-xl border border-border/70 bg-gradient-card">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 grid place-items-center">
                        <v.icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{v.label}</p>
                        <p className="font-semibold">
                          {lab ? `${lab.value}${lab.unit ? ` ${lab.unit}` : ""}` : "Not available in report"}
                        </p>
                      </div>
                      {lab && (
                        <Badge variant="outline" className={`ml-auto ${statusTone(status)}`}>
                          {statusLabel(status)}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={HeartPulse} title="No report analyzed yet" description="Upload a report to see vitals extracted from it." />
          )}
        </Card>

        <Card className="p-6 bg-gradient-primary text-primary-foreground border-0">
          <ShieldCheck className="w-7 h-7 mb-3" />
          <p className="text-sm text-primary-foreground/80">AI risk score</p>
          {analysis ? (
            <>
              <p className="font-display text-5xl font-bold mt-1">
                {analysis.riskScore.score}
                <span className="text-2xl text-primary-foreground/70">/100</span>
              </p>
              <p className="text-xs text-primary-foreground/80 mt-2 line-clamp-4">{analysis.riskScore.reasoning}</p>
            </>
          ) : (
            <p className="text-sm text-primary-foreground/80 mt-3">Upload a report to get an AI-generated risk score based on its actual contents.</p>
          )}
        </Card>
      </div>

      {/* Uploaded report analysis — driven by the real PDF extraction +
          structured Nemotron analysis pipeline (upload.controller.ts /
          document-analysis.service.ts). */}
      {(uploadStage !== "idle" || analysis || analysisError) && (
        <Card className="p-6">
          {uploadStage !== "idle" && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              {uploadStage === "uploading" && "Uploading..."}
              {uploadStage === "extracting" && "Extracting report..."}
              {uploadStage === "analyzing" && "Analyzing with AI..."}
            </div>
          )}

          {uploadStage === "idle" && analysisError && (
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">Couldn't analyze this report</p>
                <p className="text-sm text-muted-foreground mt-0.5">{analysisError}</p>
              </div>
            </div>
          )}

          {uploadStage === "idle" && analysis && !analysisError && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" /> Report Analysis
                </h3>
                <Badge variant="secondary" className="text-xs flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  Analysis based on uploaded report{analysisFileName ? `: ${analysisFileName}` : ""}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">{analysis.documentSummary}</p>

              {(analysis.patientDetails.name !== "unknown" ||
                analysis.patientDetails.age !== "unknown" ||
                analysis.patientDetails.sex !== "unknown" ||
                analysis.patientDetails.reportDate !== "unknown") && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm p-4 rounded-xl border border-border/70 bg-gradient-card">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{analysis.patientDetails.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Age</p>
                    <p className="font-medium">{analysis.patientDetails.age}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sex</p>
                    <p className="font-medium">{analysis.patientDetails.sex}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Report date</p>
                    <p className="font-medium">{analysis.patientDetails.reportDate}</p>
                  </div>
                </div>
              )}

              {analysis.labResults.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Lab results</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b border-border">
                          <th className="pb-2 pr-4 font-medium">Test</th>
                          <th className="pb-2 pr-4 font-medium">Value</th>
                          <th className="pb-2 pr-4 font-medium">Reference range</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.labResults.map((l, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-4">{l.test}</td>
                            <td className="py-2 pr-4">
                              {l.value} {l.unit}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">{l.referenceRange || "—"}</td>
                            <td className="py-2">
                              <Badge variant="outline" className={statusTone(l.status)}>
                                {l.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(analysis.diagnoses.length > 0 || analysis.medications.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {analysis.diagnoses.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-1">Diagnoses noted</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                        {analysis.diagnoses.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.medications.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-1">Medications noted</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                        {analysis.medications.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">{analysis.disclaimer}</p>
            </div>
          )}
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Key findings & risk assessment</h3>
        {!analysis ? (
          <EmptyState icon={ShieldCheck} title="No report analyzed yet" description="Upload a report to see AI-flagged findings and recommendations." />
        ) : analysis.keyFindings.length === 0 ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/30">
            <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">No abnormal findings were detected in this report.</p>
          </div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {analysis.keyFindings.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-gradient-card">
                <span>{f.finding}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">{f.value}</span>
                  <Badge variant="outline" className={statusTone(f.status)}>
                    {statusLabel(f.status)}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}

        {analysis && analysis.recommendations.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">AI recommendations</p>
              <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside space-y-0.5">
                {analysis.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
