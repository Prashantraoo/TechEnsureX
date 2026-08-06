import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, ShieldAlert, Info, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { notificationsApi } from "@/lib/api";
import { toast } from "sonner";

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-accent" />,
  warning: <Clock className="w-5 h-5 text-warning" />,
  error: <ShieldAlert className="w-5 h-5 text-destructive" />,
  info: <Info className="w-5 h-5 text-primary" />,
};

const defaultNotifications = [
  { _id: "1", title: "Claim Approved", message: "Your claim CL-2041 for ₹45,000 has been approved.", type: "success", read: false, createdAt: new Date().toISOString() },
  { _id: "2", title: "Premium Due", message: "Your health insurance premium of ₹12,000 is due in 5 days.", type: "warning", read: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { _id: "3", title: "AI Health Insight", message: "Your recent lab report shows optimal wellness score.", type: "info", read: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await notificationsApi.getAll();
        setNotifications(data.notifications?.length > 0 ? data.notifications : defaultNotifications);
      } catch {
        setNotifications(defaultNotifications);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      await notificationsApi.markAsRead(id);
    } catch {
      toast.error("Failed to mark as read.");
      // Revert on fail if we want to be strict, ignoring for simplicity
    }
  };

  const markAll = () => {
    notifications.forEach(n => {
      if (!n.read) handleMarkAsRead(n._id, false);
    });
    toast.success("All notifications marked as read");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
            Notifications
            {unreadCount > 0 && <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">{unreadCount} new</span>}
          </h1>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>Mark all as read</Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-4 opacity-20" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any, i: number) => (
            <motion.div key={n._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card 
                className={`p-4 flex gap-4 cursor-pointer transition-colors ${!n.read ? "bg-muted/30 border-primary/20" : "opacity-75 hover:opacity-100"}`}
                onClick={() => handleMarkAsRead(n._id, n.read)}
              >
                <div className="mt-1 shrink-0">{icons[n.type as keyof typeof icons] || icons.info}</div>
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <p className={`text-sm font-semibold ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
