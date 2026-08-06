import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import { Search, Filter, Plus, Link2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { claimsApi } from "@/lib/api";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  Approved: "bg-accent/15 text-accent",
  Processing: "bg-primary/15 text-primary",
  "AI Verification": "bg-secondary/15 text-secondary",
  Rejected: "bg-destructive/15 text-destructive",
};

export default function Claims() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New claim form
  const [hospital, setHospital] = useState("");
  const [type, setType] = useState("");
  const [amount, setAmount] = useState("");

  async function loadClaims() {
    try {
      const { data } = await claimsApi.getAll();
      setClaims(data.claims || []);
    } catch {
      // Backend not available — leave empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClaims(); }, []);

  const handleCreate = async () => {
    if (!hospital || !type || !amount) {
      toast.error("Please fill all fields.");
      return;
    }
    setCreating(true);
    try {
      await claimsApi.create({ hospital, type, amount: parseFloat(amount) });
      toast.success("Claim created successfully!");
      setHospital(""); setType(""); setAmount("");
      setDialogOpen(false);
      loadClaims();
    } catch (err: any) {
      toast.error(err.message || "Failed to create claim.");
    } finally {
      setCreating(false);
    }
  };

  const filtered = claims
    .filter(c => filterStatus === "All" || c.status === filterStatus)
    .filter(c =>
      search === "" ||
      c.claimId?.toLowerCase().includes(search.toLowerCase()) ||
      c.hospital?.toLowerCase().includes(search.toLowerCase()) ||
      c.type?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Claims</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track all your insurance claims.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary"><Plus className="w-4 h-4 mr-2" /> New claim</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new claim</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Hospital</Label>
                <Input placeholder="Apollo, Bandra" value={hospital} onChange={e => setHospital(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Type / Department</Label>
                <Input placeholder="Cardiology" value={type} onChange={e => setType(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input type="number" placeholder="50000" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={creating} className="bg-gradient-primary">
                  {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create claim"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        {[
          { l: "All claims", v: claims.length, c: "text-foreground" },
          { l: "Approved", v: claims.filter(c => c.status === "Approved").length, c: "text-accent" },
          { l: "In progress", v: claims.filter(c => c.status !== "Approved" && c.status !== "Rejected").length, c: "text-primary" },
          { l: "Rejected", v: claims.filter(c => c.status === "Rejected").length, c: "text-destructive" },
        ].map(s => (
          <Card key={s.l} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilterStatus(s.l === "All claims" ? "All" : s.l === "In progress" ? "Processing" : s.l)}>
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className={`font-display text-2xl font-bold mt-1 ${s.c}`}>{s.v}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search claim ID, hospital…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 px-3 rounded-md border border-border bg-background text-sm"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Approved">Approved</option>
            <option value="Processing">Processing</option>
            <option value="AI Verification">AI Verification</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No claims found. Create your first claim!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Blockchain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any, i: number) => (
                  <motion.tr key={c._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b">
                    <TableCell className="font-medium">{c.claimId}</TableCell>
                    <TableCell>{c.hospital}</TableCell>
                    <TableCell className="text-muted-foreground">{c.type}</TableCell>
                    <TableCell className="font-semibold">₹{c.amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{c.date ? new Date(c.date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><Badge className={`${statusColor[c.status] || ""} hover:${statusColor[c.status] || ""}`}>{c.status}</Badge></TableCell>
                    <TableCell><span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground"><Link2 className="w-3 h-3" /> {c.blockchainHash || "—"}</span></TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
