import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HeartPulse, Activity, Droplet, Upload, AlertTriangle, ShieldCheck, Loader2,
  FileText, CheckCircle2, ShieldQuestion, Info,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { uploadApi } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

type FindingStatus = "normal" | "high" | "low" | "abnormal" | "unknown";
// "verified": the value AND its normal/high/low classification are both
// trustworthy. "uncertain": a real value was found, but we can't reliably
// say where it falls relative to normal — never treat this as a confident
// medical finding.
type Confidence = "verified" | "uncertain";

interface LabResult {
  test: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: FindingStatus;
  confidence: Confidence;
  note?: string;
}

interface DocumentAnalysisResult {
  documentSummary: string;
  patientDetails: { name: string; age: string; sex: string; reportDate: string };
  keyFindings: Array<{ finding: string; value: string; status: FindingStatus; confidence: Confidence }>;
  medications: string[];
  // Only diagnoses the report explicitly states as such.
  diagnoses: string[];
  // Conditions named somewhere in the report but not stated as an actual
  // diagnosis — always shown separately, always flagged as unverified.
  ambiguousDiagnoses: string[];
  labResults: LabResult[];
  // null = not enough reliable data to responsibly assess risk. Must
  // NEVER be rendered as "0/100" — that would assert verified minimal
  // risk, a completely different (and unsupported) claim.
  riskScore: { score: number | null; reasoning: string };
  recommendations: string[];
  disclaimer: string;
}

type UploadStage = "idle" | "uploading" | "extracting" | "analyzing";

// Every uncertain result must visibly communicate uncertainty — this is
// the one place that decision is made, so every card/row/table cell
// stays consistent instead of each render site re-deriving its own label.
function findingPresentation(status: FindingStatus, confidence: Confidence): { label: string; tone: "verified" | "attention" | "concerning" | "uncertain" } {
  if (confidence === "uncertain") return { label: "Interpretation requires verification", tone: "uncertain" };
  if (status === "normal") return { label: "Within reported range", tone: "verified" };
  if (status === "abnormal") return { label: "Needs attention", tone: "concerning" };
  if (status === "high" || status === "low") return { label: "Needs attention", tone: "attention" };
  return { label: "Reference range unavailable", tone: "uncertain" };
}

const TONE_CLASSES: Record<ReturnType<typeof findingPresentation>["tone"], string> = {
  verified: "text-secondary border-secondary/30 bg-secondary/10",
  attention: "text-warning border-warning/30 bg-warning/10",
  concerning: "text-destructive border-destructive/30 bg-destructive/10",
  uncertain: "text-warning border-warning/30 bg-warning/10",
};

const REQUIRED_DISCLAIMER =
  "This AI-generated analysis is for informational purposes only and is not a medical diagnosis. Verify results against the original laboratory report and consult a qualified healthcare professional before making health decisions.";

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

function findVital(labResults: LabResult[], pattern: RegExp) {
  return labResults.find((l) => pattern.test(l.test));
}

// Defensively fills in fields a PRE-EXISTING scan record (stored before
// confidence/ambiguousDiagnoses/nullable-riskScore existed) won't have.
// `analysis` is stored as loosely-typed Mixed data in Mongo — nothing
// guarantees an old row matches today's shape, so this is the one place
// that gap gets closed instead of every render site guessing defensively.
function normalizeAnalysis(raw: any): DocumentAnalysisResult {
  const withConfidence = <T extends { status?: FindingStatus; confidence?: Confidence }>(item: T) => {
    const status: FindingStatus = item.status ?? "unknown";
    const confidence: Confidence =
      item.confidence === "verified" || item.confidence === "uncertain"
        ? item.confidence
        // Old records predate this field — infer it the same way the
        // backend does now: a real normal/high/low/abnormal read is
        // "verified", "unknown" is "uncertain".
        : status !== "unknown"
          ? "verified"
          : "uncertain";
    return { ...item, status, confidence };
  };

  const rawScore = raw?.riskScore?.score;
  const rawReasoning: string = raw?.riskScore?.reasoning ?? "";
  // Old records could genuinely store 0 as the hardcoded "unknown" default
  // (the exact bug this feature fixed) — recognizable by that default's
  // exact reasoning text. Anything else numeric is left as-is; we can't
  // retroactively know if it was a deliberate score.
  const isOldInsufficientDataDefault = rawScore === 0 && rawReasoning === "Not enough information to assess risk.";
  const score = rawScore === null || isOldInsufficientDataDefault ? null : typeof rawScore === "number" ? rawScore : null;

  return {
    documentSummary: raw?.documentSummary ?? "",
    patientDetails: raw?.patientDetails ?? { name: "unknown", age: "unknown", sex: "unknown", reportDate: "unknown" },
    keyFindings: Array.isArray(raw?.keyFindings) ? raw.keyFindings.map(withConfidence) : [],
    medications: Array.isArray(raw?.medications) ? raw.medications : [],
    diagnoses: Array.isArray(raw?.diagnoses) ? raw.diagnoses : [],
    ambiguousDiagnoses: Array.isArray(raw?.ambiguousDiagnoses) ? raw.ambiguousDiagnoses : [],
    labResults: Array.isArray(raw?.labResults) ? raw.labResults.map(withConfidence) : [],
    riskScore: { score, reasoning: isOldInsufficientDataDefault ? INSUFFICIENT_DATA_REASONING : rawReasoning },
    recommendations: Array.isArray(raw?.recommendations) ? raw.recommendations : [],
    disclaimer: raw?.disclaimer ?? "",
  };
}

const INSUFFICIENT_DATA_REASONING = "Some required values could not be reliably extracted from this report.";

export default function HealthReport() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [analysisFileName, setAnalysisFileName] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
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
          setAnalysis(normalizeAnalysis(latest.analysis));
          setAnalysisFileName(latest.fileName ?? null);
          setPageCount(typeof latest.pageCount === "number" ? latest.pageCount : null);
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
        setAnalysis(normalizeAnalysis(data.scan.analysis));
        setAnalysisFileName(data.scan.fileName || file.name);
        setPageCount(typeof data.scan.pageCount === "number" ? data.scan.pageCount : null);
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
  const uncertainResults = labResults.filter((l) => l.confidence === "uncertain");

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Health Report"
        description="Powered by your medical history, prescriptions and lab reports."
        actions={
          <>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploadStage === "uploading" && "Uploading..."}
              {uploadStage === "extracting" && "Extracting report..."}
              {uploadStage === "analyzing" && "Analyzing with AI..."}
              {uploadStage === "idle" && "Upload new report"}
            </Button>
          </>
        }
      />

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Vitals snapshot</h3>
        {analysis ? (
          <div className="grid sm:grid-cols-3 gap-4">
            {VITAL_DEFS.map((v, i) => {
              const lab = findVital(labResults, v.match);
              const presentation = lab ? findingPresentation(lab.status, lab.confidence) : null;
              return (
                <motion.div key={v.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="p-4 rounded-xl border border-border/70 bg-gradient-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                      <v.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{v.label}</p>
                      <p className="font-semibold truncate">
                        {lab ? `${lab.value}${lab.unit ? ` ${lab.unit}` : ""}` : "Not available in report"}
                      </p>
                    </div>
                  </div>
                  {presentation && (
                    <Badge variant="outline" className={cn("mt-3 w-full justify-center", TONE_CLASSES[presentation.tone])}>
                      {presentation.label}
                    </Badge>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={HeartPulse} title="No report analyzed yet" description="Upload a report to see vitals extracted from it." />
        )}
      </Card>

      {/* Uploaded report analysis — driven by the real PDF extraction +
          structured Nemotron analysis pipeline (upload.controller.ts /
          document-analysis.service.ts). Every uncertain extraction stays
          visibly uncertain here; nothing is upgraded to a confident
          finding just because it renders in a clean card. */}
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
            <div className="space-y-7">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-base">AI Health Analysis</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs flex items-center gap-1.5 text-secondary border-secondary/30 bg-secondary/10">
                    <CheckCircle2 className="w-3 h-3" /> Analysis completed
                  </Badge>
                  {pageCount != null && (
                    <span className="text-xs text-muted-foreground">{pageCount}-page report analyzed</span>
                  )}
                </div>
              </div>

              {/* Overall assessment */}
              <div>
                <p className="text-sm font-semibold mb-1.5">Overall assessment</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis.documentSummary}</p>
              </div>

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

              {/* Key findings */}
              {analysis.keyFindings.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2.5">Key findings</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {analysis.keyFindings.map((f, i) => {
                      const presentation = findingPresentation(f.status, f.confidence);
                      return (
                        <div key={i} className="p-4 rounded-xl border border-border/70 bg-card">
                          <p className="text-sm font-medium truncate">{f.finding}</p>
                          <p className="font-display text-lg font-bold mt-0.5 text-foreground">{f.value}</p>
                          <Badge variant="outline" className={cn("mt-2 text-xs", TONE_CLASSES[presentation.tone])}>
                            {presentation.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Data quality & verification */}
              {uncertainResults.length > 0 && (
                <div className="p-4 rounded-xl border border-warning/30 bg-warning/5">
                  <div className="flex items-start gap-3">
                    <ShieldQuestion className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Data quality &amp; verification</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Some values in this report could not be reliably extracted because of document formatting or incomplete source data.
                      </p>
                      <ul className="mt-2.5 space-y-1 text-sm text-muted-foreground">
                        {uncertainResults.map((l, i) => (
                          <li key={i}>
                            <span className="font-medium text-foreground">{l.test}</span>
                            {" — "}
                            {l.note || "extraction ambiguous"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed results */}
              {analysis.labResults.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Detailed results</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b border-border">
                          <th className="pb-2 pr-4 font-medium">Test</th>
                          <th className="pb-2 pr-4 font-medium">Result</th>
                          <th className="pb-2 pr-4 font-medium">Reference</th>
                          <th className="pb-2 pr-4 font-medium">Status</th>
                          <th className="pb-2 font-medium">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.labResults.map((l, i) => {
                          const presentation = findingPresentation(l.status, l.confidence);
                          return (
                            <tr key={i} className="border-b border-border/50 last:border-0">
                              <td className="py-2.5 pr-4">{l.test}</td>
                              <td className="py-2.5 pr-4 whitespace-nowrap">
                                {l.value} {l.unit}
                              </td>
                              <td className="py-2.5 pr-4 text-muted-foreground">{l.referenceRange || "—"}</td>
                              <td className="py-2.5 pr-4">
                                <Badge variant="outline" className={cn("text-xs", TONE_CLASSES[presentation.tone])}>
                                  {presentation.label}
                                </Badge>
                              </td>
                              <td className="py-2.5">
                                <span className={cn("text-xs font-medium", l.confidence === "verified" ? "text-secondary" : "text-warning")}>
                                  {l.confidence === "verified" ? "Verified" : "Uncertain"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Diagnoses */}
              {(analysis.diagnoses.length > 0 || analysis.ambiguousDiagnoses.length > 0 || analysis.medications.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {analysis.diagnoses.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-1">Diagnoses mentioned in report</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                        {analysis.diagnoses.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.ambiguousDiagnoses.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-warning shrink-0" /> Potentially referenced — requires verification
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                        {analysis.ambiguousDiagnoses.map((d, i) => (
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

              {/* Risk assessment */}
              <div className="p-4 rounded-xl border border-border/70 bg-gradient-card">
                <p className="text-sm font-semibold mb-1">Risk assessment</p>
                {analysis.riskScore.score === null ? (
                  <>
                    <p className="font-display text-xl font-bold text-foreground">Not enough reliable data</p>
                    <p className="text-sm text-muted-foreground mt-1">{analysis.riskScore.reasoning}</p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-3xl font-bold text-foreground">
                      {analysis.riskScore.score}
                      <span className="text-lg text-muted-foreground">/100</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{analysis.riskScore.reasoning}</p>
                  </>
                )}
              </div>

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Recommendations</p>
                    <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside space-y-0.5">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
                {REQUIRED_DISCLAIMER}
              </p>
            </div>
          )}
        </Card>
      )}

      {!analysis && uploadStage === "idle" && !analysisError && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Key findings &amp; risk assessment</h3>
          <EmptyState icon={ShieldCheck} title="No report analyzed yet" description="Upload a report to see verified findings and a risk assessment based on its actual contents." />
        </Card>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground/80 flex-wrap">
        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{analysisFileName ? `Source: ${analysisFileName}` : "Upload a lab or medical report to begin."}</span>
      </div>
    </div>
  );
}
