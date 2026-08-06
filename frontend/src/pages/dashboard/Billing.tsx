import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download, ExternalLink, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { billingApi } from "@/lib/api";
import { toast } from "sonner";

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
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Billing & Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your subscriptions and payment methods.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 bg-gradient-primary text-primary-foreground">
          <h3 className="font-semibold mb-6 text-primary-foreground/80">Active Plan</h3>
          <p className="font-display text-2xl font-bold">TechEnsureX Premium</p>
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-3xl font-bold tracking-tight">₹18,400<span className="text-lg font-normal text-primary-foreground/70">/yr</span></p>
              <p className="text-xs text-primary-foreground/80 mt-1">Renews on Oct 12, 2024</p>
            </div>
            <Button variant="secondary" size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0" onClick={() => toast.success("Upgrade options sent to your email.")}>
              Upgrade
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Payment Method</h3>
            <Button variant="outline" size="sm" onClick={() => toast.info("Opening secure payment setup...")}>Update</Button>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
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
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Invoice</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv, i) => (
                  <motion.tr key={inv._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{inv.planName}</td>
                    <td className="px-6 py-4">₹{inv.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={
                        inv.status === "paid" ? "bg-accent/15 text-accent" : 
                        inv.status === "pending" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                      }>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === "paid" ? (
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => handleDownload(inv)}>
                          <Download className="w-4 h-4 mr-2" /> Receipt
                        </Button>
                      ) : (
                        <Button size="sm" className="bg-gradient-primary" onClick={handlePaymentAction}>
                          Pay now <ExternalLink className="w-3 h-3 ml-1.5" />
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
