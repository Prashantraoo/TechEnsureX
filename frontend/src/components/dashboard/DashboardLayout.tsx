import { NavLink, Outlet, useLocation, Link, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Shield, FileText, HeartPulse, Wallet, History,
  MessageSquare, Bell, CreditCard, Settings, Search, Menu, LogOut, Users, ChevronDown, ChevronRight, User as UserIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useState, useEffect } from "react";
import { ChatbotWidget } from "./ChatbotWidget";
import { ThemeToggle } from "@/components/theme-toggle";
import { isAuthenticated, getCurrentUser, logout } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api";
import { LoadingState } from "@/components/shared/LoadingState";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  adminOnly?: boolean;
}

// Grouped for sidebar section headers (Overview / Insurance / Health /
// Services / Account) — purely a presentation grouping over the same flat
// route list; adminOnly filtering and route guarding logic is unchanged.
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true }],
  },
  {
    label: "Insurance",
    items: [
      { to: "/dashboard/plans", icon: Shield, label: "Insurance Plans" },
      { to: "/dashboard/claims", icon: FileText, label: "Claims" },
      { to: "/dashboard/settlement", icon: Wallet, label: "Claim Settlement" },
    ],
  },
  {
    label: "Health",
    items: [
      { to: "/dashboard/health-report", icon: HeartPulse, label: "AI Health Report" },
      { to: "/dashboard/history", icon: History, label: "Medical History" },
    ],
  },
  {
    label: "Services",
    items: [{ to: "/dashboard/assistant", icon: MessageSquare, label: "AI Chat Assistant" }],
  },
  {
    label: "Account",
    items: [
      { to: "/dashboard/notifications", icon: Bell, label: "Notifications" },
      { to: "/dashboard/billing", icon: CreditCard, label: "Billing" },
      { to: "/dashboard/admin", icon: Users, label: "Admin Panel", adminOnly: true },
      { to: "/dashboard/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const nav = navGroups.flatMap((g) => g.items);

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

    notificationsApi
      .getAll()
      .then(({ data }) => setUnreadCount((data.notifications || []).filter((n: any) => !n.read).length))
      .catch(() => {});
  }, []);

  // Cmd/Ctrl+K opens the command palette from anywhere in the dashboard.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const goTo = (to: string) => {
    setPaletteOpen(false);
    navigate(to);
  };

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully.");
    navigate("/");
  };

  // While checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState variant="spinner" className="min-h-screen" />
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

  const visibleNav = nav.filter((item) => !item.adminOnly || user?.role === "admin");

  // The sidebar already hides admin-only links from non-admins, but that's
  // presentation only — someone typing /dashboard/admin directly must be
  // blocked here too, not just left to whatever the page itself renders.
  const adminOnlyPaths = nav.filter((item) => item.adminOnly).map((item) => item.to);
  if (adminOnlyPaths.includes(pathname) && user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen bg-background flex">
      {/* Sidebar — white surface with a hairline border, grouped into labeled
          sections. Active state is a soft tinted pill with a left indicator,
          never a solid color fill. */}
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-16 shrink-0 flex items-center gap-2 px-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center shrink-0">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold tracking-tight text-sidebar-foreground">
              Tech<span className="text-primary">EnsureX</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => {
            const items = group.items.filter((item) => !item.adminOnly || user?.role === "admin");
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to} to={item.to} end={item.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                          isActive
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="dash-nav-active"
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                              className="absolute inset-0 rounded-lg bg-sidebar-primary"
                            />
                          )}
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-primary" />
                          )}
                          <item.icon className="relative z-10 w-4 h-4 shrink-0" />
                          <span className="relative z-10 truncate flex-1">{item.label}</span>
                          {item.label === "Notifications" && unreadCount > 0 && (
                            <span className="relative z-10 shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-success/15 text-success text-[10px] font-semibold grid place-items-center">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="shrink-0 p-3 border-t border-sidebar-border space-y-1">
          {user && (
            <Link
              to="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-sidebar-border hover:bg-sidebar-accent transition-colors"
            >
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                <p className="text-sm font-medium leading-none text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs leading-none text-sidebar-foreground/50 truncate">View profile</p>
              </div>
              <ChevronRight className="w-4 h-4 text-sidebar-foreground/30 shrink-0" />
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-left transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main canvas — flat, no ambient gradient wash; cards carry their own
          elevation via border + shadow-soft. */}
      <div className="relative flex-1 min-w-0 flex flex-col bg-muted/20">
        <header className="sticky top-0 z-20 h-16 bg-background/95 backdrop-blur-xl border-b border-border flex items-center gap-3 px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </Button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="relative max-w-md flex-1 hidden sm:flex items-center h-10 rounded-lg bg-muted/50 border border-border/60 px-3 text-left text-sm text-muted-foreground hover:bg-muted/70 hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate flex-1">Search claims, plans, patients, pages...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setPaletteOpen(true)} aria-label="Search">
            <Search className="w-4 h-4" />
          </Button>

          <div className="flex-1 sm:hidden" />

          {/* Action group — pinned to the far right regardless of how much
              space the capped-width search bar leaves free. */}
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"} asChild>
              <Link to="/dashboard/notifications">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold grid place-items-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg pl-1 pr-2.5 py-1 hover:bg-muted transition-colors">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col justify-center gap-0.5 text-left">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-[11px] leading-none text-muted-foreground capitalize">{user.role}</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings"><UserIcon className="w-4 h-4 mr-2" /> Profile & settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="relative flex-1 p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </motion.main>
      </div>

      {/* Command palette — Ctrl/Cmd+K or the search bar. */}
      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="overflow-hidden p-0 max-w-xl top-[20%] translate-y-0">
          <DialogTitle className="sr-only">Search TechEnsureX</DialogTitle>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
            <CommandInput placeholder="Search claims, plans, patients, pages..." />
            <CommandList>
              <CommandEmpty>No pages match your search.</CommandEmpty>
              {navGroups.map((group) => {
                const items = group.items.filter((item) => !item.adminOnly || user?.role === "admin");
                if (items.length === 0) return null;
                return (
                  <CommandGroup key={group.label} heading={group.label}>
                    {items.map((item) => (
                      <CommandItem key={item.to} value={item.label} onSelect={() => goTo(item.to)}>
                        <item.icon className="mr-2" />
                        {item.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <ChatbotWidget />
    </div>
  );
}
