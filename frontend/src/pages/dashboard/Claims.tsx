import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Search, Filter, Plus, Link2, Loader2, Inbox } from "lucide-react";
import { useState, useEffect } from "react";
import { claimsApi } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";

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
      <PageHeader
        title="Claims"
        description="Manage and track all your insurance claims."
        actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New claim</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new claim</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="claim-hospital">Hospital</Label>
                <Input id="claim-hospital" placeholder="Apollo, Bandra" value={hospital} onChange={e => setHospital(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-type">Type / Department</Label>
                <Input id="claim-type" placeholder="Cardiology" value={type} onChange={e => setType(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-amount">Amount (₹)</Label>
                <Input id="claim-amount" type="number" placeholder="50000" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create claim"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      <div className="grid sm:grid-cols-4 gap-3">
        {[
          { l: "All claims", v: claims.length, filter: "All", tone: "neutral" as const },
          { l: "Approved", v: claims.filter(c => c.status === "Approved").length, filter: "Approved", tone: "success" as const },
          { l: "In progress", v: claims.filter(c => c.status !== "Approved" && c.status !== "Rejected").length, filter: "Processing", tone: "info" as const },
          { l: "Rejected", v: claims.filter(c => c.status === "Rejected").length, filter: "Rejected", tone: "error" as const },
        ].map(s => (
          <MetricCard
            key={s.l}
            label={s.l}
            value={s.v}
            tone={s.tone}
            active={filterStatus === s.filter}
            onClick={() => setFilterStatus(s.filter)}
          />
        ))}
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <label htmlFor="claims-search" className="sr-only">Search claims</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="claims-search"
              placeholder="Search claim ID, hospital…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="AI Verification">AI Verification</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <LoadingState variant="table" rows={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No claims found"
              description={claims.length === 0 ? "Create your first claim to get started." : "Try adjusting your search or filter."}
              action={claims.length === 0 && (
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> New claim
                </Button>
              )}
            />
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
                  <TableHead>Verification ID</TableHead>
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
                    <TableCell><StatusBadge status={c.status} /></TableCell>
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
