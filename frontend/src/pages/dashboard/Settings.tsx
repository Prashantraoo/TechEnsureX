import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  User, Bell, Shield, Wallet, Save, LogOut, Loader2,
  ChevronRight, KeyRound, Smartphone, Monitor,
} from "lucide-react";
import { useState, useEffect } from "react";
import { userApi } from "@/lib/api";
import { getCurrentUser, AuthUser, logout } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";

const navItems = [
  { value: "profile", icon: User, label: "Profile" },
  { value: "notifications", icon: Bell, label: "Notifications" },
  { value: "security", icon: Shield, label: "Security" },
  { value: "billing", icon: Wallet, label: "Billing" },
];

export default function Settings() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const u = await getCurrentUser();
      setUser(u);
      setName(u?.name || "");
      setEmail(u?.email || "");
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await userApi.updateProfile({ name, email });
      // Update local storage via auth util manually or reload
      localStorage.setItem("hg_user", JSON.stringify(data.user));
      setUser(data.user);
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    navigate("/");
  };

  const handleToggle = (setting: string) => {
    toast.success(`${setting} preference updated`);
  };

  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account, preferences and security." />

      <Tabs defaultValue="profile" className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-56 shrink-0 space-y-1">
          <TabsList className="flex flex-row md:flex-col w-full h-auto bg-transparent p-0 gap-1 overflow-x-auto md:overflow-visible justify-start rounded-none">
            {navItems.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="w-full justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted hover:text-foreground transition-colors shrink-0"
              >
                <item.icon className="w-4 h-4 shrink-0" /> {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors md:mt-2 md:border-t md:border-border md:pt-4"
          >
            <LogOut className="w-4 h-4 shrink-0" /> Log out
          </button>
        </div>

        <div className="flex-1 min-w-0 w-full">
          <TabsContent value="profile" className="mt-0">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">Profile information</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage the information associated with your TechEnsureX account.</p>

              <div className="mt-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary grid place-items-center text-xl font-semibold shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{user?.name || name}</p>
                  <Button variant="outline" size="sm" className="mt-2">Change avatar</Button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">Preferences</h3>
              <p className="text-sm text-muted-foreground mt-1">Choose what TechEnsureX keeps you updated on.</p>

              <div className="mt-6 divide-y divide-border">
                <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">Email notifications</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Receive updates about your claims and policies.</p>
                  </div>
                  <Switch defaultChecked onCheckedChange={() => handleToggle("Email notifications")} />
                </div>
                <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">AI insights</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Allow TechEnsureX to analyze your health data for relevant recommendations.</p>
                  </div>
                  <Switch defaultChecked onCheckedChange={() => handleToggle("AI insights")} />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">Security</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage how you sign in and keep your account protected.</p>

              <div className="mt-6 divide-y divide-border">
                <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted grid place-items-center shrink-0">
                      <KeyRound className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Password</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Change your account password.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => toast.info("Password reset link sent to your email.")}>
                    Change password
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted grid place-items-center shrink-0">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Protect your account with an additional verification step.</p>
                    </div>
                  </div>
                  <Switch onCheckedChange={() => handleToggle("Two-factor authentication")} />
                </div>
                <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted grid place-items-center shrink-0">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Active sessions</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Review devices currently signed into your account.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => toast.info("Session management is coming soon.")}>
                    Review
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-0">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-foreground">Billing</h3>
              <p className="text-sm text-muted-foreground mt-1">Your plan, payment method and invoices.</p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-border bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground">TechEnsureX Premium</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Full plan details, payment method and invoice history.</p>
                </div>
                <Button asChild size="sm">
                  <Link to="/dashboard/billing">
                    Manage billing <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Danger zone — always visible, visually separated at the bottom.
          Only the label and button carry red; the card itself stays neutral. */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-destructive">Danger zone</p>
            <p className="text-sm text-muted-foreground mt-0.5">Permanently delete your TechEnsureX account and all associated data.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => toast.error("Account deletion requires admin approval.")}>
            Delete account
          </Button>
        </div>
      </Card>
    </div>
  );
}
