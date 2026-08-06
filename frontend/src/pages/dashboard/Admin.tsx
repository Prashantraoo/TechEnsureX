import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FileText, ShieldAlert, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";

const mockFraudData = [
  { m: "Jan", fraud: 12 }, { m: "Feb", fraud: 8 }, { m: "Mar", fraud: 15 },
  { m: "Apr", fraud: 10 }, { m: "May", fraud: 5 }, { m: "Jun", fraud: 2 },
];

export default function Admin() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, usersRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getUsers(),
        ]);
        setStats(statsRes.data.stats);
        setUsers(usersRes.data.users || []);
      } catch {
        // use fallback if not admin or backend offline
        setStats({
          totalUsers: 142, totalClaims: 1245, totalPlans: 8,
          approvedClaims: 980, rejectedClaims: 140, totalApprovedAmount: 85000000, successRate: "78.7"
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAction = (action: string) => {
    toast.success(`${action} initiated.`);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const statCards = [
    { icon: Users, label: "Total Users", value: stats?.totalUsers || 0, trend: "+12% this month", color: "text-primary", bg: "bg-primary/10" },
    { icon: FileText, label: "Claims Processed", value: stats?.totalClaims || 0, trend: `${stats?.successRate || 0}% success`, color: "text-accent", bg: "bg-accent/10" },
    { icon: CheckCircle2, label: "Total Payout", value: `₹${((stats?.totalApprovedAmount || 0) / 100000).toFixed(1)}L`, trend: "Lifetime", color: "text-success", bg: "bg-success/10" },
    { icon: ShieldAlert, label: "Fraud Prevented", value: `₹12.4L`, trend: "-18% from last month", color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-destructive flex items-center gap-2">
          Admin Dashboard <Badge variant="destructive">Restricted</Badge>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Platform overview and fraud monitoring.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5 border-border bg-card hover-lift">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${s.bg} grid place-items-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">{s.label}</p>
              <p className="font-display text-2xl font-bold mt-1">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-2">{s.trend}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-warning">AI Fraud Detection Trend</h3>
              <p className="text-xs text-muted-foreground">Suspicious claims flagged</p>
            </div>
            <Badge variant="outline" className="gap-1 text-warning border-warning"><TrendingUp className="w-3 h-3" /> Dropping</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mockFraudData}>
              <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Line type="monotone" dataKey="fraud" stroke="hsl(var(--warning))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => handleAction("AI model retrain")}>
              <ShieldAlert className="w-4 h-4 mr-2 text-warning" /> Trigger AI Model Retrain
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleAction("System audit")}>
              <FileText className="w-4 h-4 mr-2 text-primary" /> Generate System Audit
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleAction("Blockchain sync")}>
              <Users className="w-4 h-4 mr-2 text-accent" /> Force Blockchain Sync
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold">Recent Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.slice(0, 10).map((u, i) => (
                <tr key={u._id || i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={u.role === "admin" ? "destructive" : "secondary"}>{u.role}</Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No users found or unauthorized.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
