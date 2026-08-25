import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import { Plus, Loader2, History as HistoryIcon, Building2, Stethoscope } from "lucide-react";
import { useState, useEffect } from "react";
import { medicalHistoryApi } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

export default function MedicalHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // New record form
  const [date, setDate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [hospital, setHospital] = useState("");
  const [doctor, setDoctor] = useState("");
  const [notes, setNotes] = useState("");

  async function loadHistory() {
    try {
      const { data } = await medicalHistoryApi.getHistory();
      setHistory(data.history?.records || []);
    } catch {
      // Backend not connected or empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  const handleAdd = async () => {
    if (!date || !diagnosis || !hospital || !doctor) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setAdding(true);
    try {
      await medicalHistoryApi.addRecord({ date, diagnosis, hospital, doctor, notes });
      toast.success("Medical record added!");
      setDate(""); setDiagnosis(""); setHospital(""); setDoctor(""); setNotes("");
      setDialogOpen(false);
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to add record.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical History"
        description="Your securely stored health records."
        actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add record</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Medical Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="record-date">Date</Label>
                <Input id="record-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="record-diagnosis">Diagnosis</Label>
                <Input id="record-diagnosis" placeholder="e.g. Hypertension" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="record-hospital">Hospital/Clinic</Label>
                  <Input id="record-hospital" placeholder="Apollo" value={hospital} onChange={e => setHospital(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="record-doctor">Doctor</Label>
                  <Input id="record-doctor" placeholder="Dr. Sharma" value={doctor} onChange={e => setDoctor(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="record-notes">Notes (Optional)</Label>
                <Textarea id="record-notes" placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAdd} disabled={adding}>
                  {adding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Record"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      <div className="relative">
        <div className="absolute left-4 sm:left-8 top-0 bottom-0 w-px bg-border" />
        {loading ? (
          <LoadingState variant="list" rows={4} className="pl-8 sm:pl-16" />
        ) : history.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="No medical records found" className="pl-8 sm:pl-16" />
        ) : (
          <div className="space-y-8 pl-12 sm:pl-20 py-4">
            {history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r: any, i: number) => (
              <motion.div key={r._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="relative">
                <div className="absolute -left-12 sm:-left-20 w-8 h-8 rounded-full bg-card border-2 border-primary grid place-items-center z-10 translate-x-[4px] sm:translate-x-0">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <Card className="p-5 hover-lift">
                  <div className="flex flex-wrap gap-2 justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{r.diagnosis}</h3>
                    <Badge variant="outline">{new Date(r.date).toLocaleDateString()}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4">
                    <p className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {r.hospital}</p>
                    <p className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> {r.doctor}</p>
                  </div>
                  {r.notes && <p className="text-sm bg-muted/50 p-3 rounded-lg border border-border/70">{r.notes}</p>}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
