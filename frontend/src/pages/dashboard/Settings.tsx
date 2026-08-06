import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Shield, Wallet, Save, LogOut, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { userApi } from "@/lib/api";
import { getCurrentUser, AuthUser, logout } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
      </div>

      <div className="grid md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-4 space-y-2">
          {[
            { icon: User, label: "Profile", active: true },
            { icon: Bell, label: "Notifications" },
            { icon: Shield, label: "Security" },
            { icon: Wallet, label: "Billing" },
          ].map((item) => (
            <Button
              key={item.label}
              variant={item.active ? "secondary" : "ghost"}
              className={`w-full justify-start ${item.active ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}`}
            >
              <item.icon className="w-4 h-4 mr-3" /> {item.label}
            </Button>
          ))}
          <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-3" /> Log out
          </Button>
        </div>

        <div className="md:col-span-8 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-6">Profile Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-2xl font-bold">
                  {name.charAt(0).toUpperCase() || "U"}
                </div>
                <Button variant="outline" size="sm">Change avatar</Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="pt-4 flex justify-end">
                <Button className="bg-gradient-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-6">Preferences</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates about your claims and policies.</p>
                </div>
                <Switch defaultChecked onCheckedChange={() => handleToggle("Email notifications")} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">AI Insights</p>
                  <p className="text-sm text-muted-foreground">Allow EnsureAI to analyze your health data for better recommendations.</p>
                </div>
                <Switch defaultChecked onCheckedChange={() => handleToggle("AI Insights")} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-destructive">Danger Zone</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => toast.error("Account deletion requires admin approval.")}>Delete Account</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
