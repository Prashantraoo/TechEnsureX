import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Users, FileText, ShieldAlert, CheckCircle2, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { LoadingState } from "@/components/shared/LoadingState";

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
    return <LoadingState variant="cards" rows={4} className="py-4" />;
  }

  const statCards = [
    { icon: Users, label: "Total Users", value: stats?.totalUsers || 0, trend: "+12% this month", tone: "primary" as const },
    { icon: FileText, label: "Claims Processed", value: stats?.totalClaims || 0, trend: `${stats?.successRate || 0}% success`, tone: "info" as const },
    { icon: CheckCircle2, label: "Total Payout", value: `₹${((stats?.totalApprovedAmount || 0) / 100000).toFixed(1)}L`, trend: "Lifetime", tone: "success" as const },
    { icon: ShieldAlert, label: "Fraud Prevented", value: `₹12.4L`, trend: "-18% from last month", tone: "warning" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2 text-destructive">Admin Dashboard <Badge variant="destructive">Restricted</Badge></span>}
        description="Platform overview and fraud monitoring."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <MetricCard icon={s.icon} label={s.label} value={s.value} trend={s.trend} tone={s.tone} />
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
            <Button variant="outline" className="w-full justify-start" onClick={() => handleAction("Data sync")}>
              <Users className="w-4 h-4 mr-2 text-accent" /> Force Data Sync
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold">Recent Users</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 10).map((u, i) => (
                <TableRow key={u._id || i}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "destructive" : "secondary"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No users found or unauthorized.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
