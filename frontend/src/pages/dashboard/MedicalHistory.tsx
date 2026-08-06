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
import { FileText, Plus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { medicalHistoryApi } from "@/lib/api";
import { toast } from "sonner";

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Medical History</h1>
          <p className="text-muted-foreground text-sm mt-1">Your securely stored health records.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary"><Plus className="w-4 h-4 mr-2" /> Add record</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Medical Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Diagnosis</Label>
                <Input placeholder="e.g. Hypertension" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Hospital/Clinic</Label>
                  <Input placeholder="Apollo" value={hospital} onChange={e => setHospital(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Doctor</Label>
                  <Input placeholder="Dr. Sharma" value={doctor} onChange={e => setDoctor(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (Optional)</Label>
                <Textarea placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAdd} disabled={adding} className="bg-gradient-primary">
                  {adding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Record"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <div className="absolute left-4 sm:left-8 top-0 bottom-0 w-px bg-border" />
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground pl-8 sm:pl-16">
            <p>No medical records found.</p>
          </div>
        ) : (
          <div className="space-y-8 pl-12 sm:pl-20 py-4">
            {history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r: any, i: number) => (
              <motion.div key={r._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="relative">
                <div className="absolute -left-12 sm:-left-20 w-8 h-8 rounded-full bg-card border-2 border-primary grid place-items-center z-10 translate-x-[4px] sm:translate-x-0">
                  <div className="w-3 h-3 rounded-full bg-gradient-primary" />
                </div>
                <Card className="p-5 hover-lift">
                  <div className="flex flex-wrap gap-2 justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{r.diagnosis}</h3>
                    <Badge variant="outline">{new Date(r.date).toLocaleDateString()}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4">
                    <p>🏥 {r.hospital}</p>
                    <p>👨‍⚕️ {r.doctor}</p>
                  </div>
                  {r.notes && <p className="text-sm bg-muted/50 p-3 rounded-lg border border-border">{r.notes}</p>}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
