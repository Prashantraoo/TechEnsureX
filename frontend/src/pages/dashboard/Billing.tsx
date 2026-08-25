import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Download, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { billingApi } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/LoadingState";

const defaultBilling = [
  { _id: "b1", planName: "Star Health Family Optima", amount: 18400, status: "pending", dueDate: new Date(Date.now() + 864000000).toISOString() },
  { _id: "b2", planName: "HDFC Ergo Suraksha", amount: 14200, status: "paid", dueDate: new Date(Date.now() - 30 * 86400000).toISOString(), paidAt: new Date(Date.now() - 32 * 86400000).toISOString() },
];

export default function Billing() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await billingApi.getAll();
        setInvoices(data.billing?.length > 0 ? data.billing : defaultBilling);
      } catch {
        setInvoices(defaultBilling);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDownload = (invoice: any) => {
    toast.success(`Downloading invoice for ${invoice.planName}...`);
    // Simulated download logic could go here
  };

  const handlePaymentAction = () => {
    toast.info("Payment gateway integration pending.");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Payments" description="Manage your subscriptions and payment methods." />

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 border-l-[3px] border-l-primary">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Active Plan</h3>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Premium</Badge>
          </div>
          <p className="font-display text-2xl font-bold">TechEnsureX Premium</p>
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-3xl font-bold tracking-tight">₹18,400<span className="text-lg font-normal text-muted-foreground">/yr</span></p>
              <p className="text-xs text-muted-foreground mt-1">Renews on Oct 12, 2024</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.success("Upgrade options sent to your email.")}>
              Upgrade
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Payment Method</h3>
            <Button variant="outline" size="sm" onClick={() => toast.info("Opening secure payment setup...")}>Update</Button>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border/70 bg-muted/30">
            <div className="w-12 h-8 rounded bg-[#1A1F36] grid place-items-center">
              <span className="text-white text-[10px] font-bold">VISA</span>
            </div>
            <div>
              <p className="text-sm font-semibold">•••• •••• •••• 4242</p>
              <p className="text-xs text-muted-foreground">Expires 12/25</p>
            </div>
            <Badge variant="secondary" className="ml-auto">Default</Badge>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold">Billing History</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <LoadingState variant="table" rows={4} className="p-6" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv, i) => (
                  <motion.tr key={inv._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium">{inv.planName}</TableCell>
                    <TableCell>₹{inv.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-right">
                      {inv.status === "paid" ? (
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => handleDownload(inv)}>
                          <Download className="w-4 h-4 mr-2" /> Receipt
                        </Button>
                      ) : (
                        <Button size="sm" onClick={handlePaymentAction}>
                          Pay now <ExternalLink className="w-3 h-3 ml-1.5" />
                        </Button>
                      )}
                    </TableCell>
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
