import { NavLink, Outlet, useLocation, Link, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Shield, FileText, HeartPulse, Wallet, History,
  MessageSquare, Bell, CreditCard, Settings, Search, Menu, LogOut, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { ChatbotWidget } from "./ChatbotWidget";
import { isAuthenticated, getCurrentUser, logout } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/dashboard/plans", icon: Shield, label: "Insurance Plans" },
  { to: "/dashboard/claims", icon: FileText, label: "Claims" },
  { to: "/dashboard/health-report", icon: HeartPulse, label: "AI Health Report" },
  { to: "/dashboard/settlement", icon: Wallet, label: "Claim Settlement" },
  { to: "/dashboard/history", icon: History, label: "Medical History" },
  { to: "/dashboard/assistant", icon: MessageSquare, label: "AI Chat Assistant" },
  { to: "/dashboard/notifications", icon: Bell, label: "Notifications" },
  { to: "/dashboard/billing", icon: CreditCard, label: "Billing" },
  { to: "/dashboard/admin", icon: Users, label: "Admin Panel" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully.");
    navigate("/");
  };

  // While checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/sign-in" replace />;
  }

  const initials = user
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary grid place-items-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold tracking-tight">TechEnsureX</span>
          </Link>
        </div>
        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100vh-4rem-5rem)]">
          {nav.map((item) => (
            <NavLink
              key={item.to} to={item.to} end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 inset-x-0 p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent/60 w-full text-left"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 glass border-b border-border flex items-center gap-4 px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="relative max-w-md flex-1 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search claims, policies, hospitals…" className="pl-9 h-10 bg-background/60" />
          </div>
          <div className="flex-1 sm:hidden" />
          {user && (
            <span className="text-sm text-muted-foreground hidden md:block">
              Welcome, <span className="font-semibold text-foreground">{user.name.split(" ")[0]}</span>
            </span>
          )}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          </Button>
          <Avatar className="w-9 h-9 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </header>

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </motion.main>
      </div>

      <ChatbotWidget />
    </div>
  );
}
