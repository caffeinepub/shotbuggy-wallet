import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Bell, Globe, LogOut, Moon, Shield, Sun, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCallerPrincipal } from "../hooks/useQueries";
import type { Theme } from "../hooks/useTheme";

interface SettingsPageProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export default function SettingsPage({
  theme,
  onToggleTheme,
}: SettingsPageProps) {
  const { clear } = useInternetIdentity();
  const { data: principal } = useCallerPrincipal();
  const { actor } = useActor();
  const [displayName, setDisplayName] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!actor || profileLoaded) return;
    actor
      .getCallerUserProfile()
      .then((profile) => {
        if (profile) {
          setDisplayName(profile.name);
        }
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [actor, profileLoaded]);

  async function handleSaveProfile() {
    if (!actor || !displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    setSaving(true);
    try {
      await actor.saveCallerUserProfile({ name: displayName });
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function handleDisconnect() {
    clear();
    toast.success("Disconnected from wallet");
  }

  return (
    <div className="animate-fade-in max-w-2xl" data-ocid="settings.page">
      <h2 className="text-xl font-display font-bold mb-5">Settings</h2>
      <div className="space-y-4">
        <Card className="border-border shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Principal ID
              </Label>
              <Input
                data-ocid="settings.principal.input"
                readOnly
                value={principal ?? ""}
                className="font-mono text-xs bg-muted/30"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Display Name
              </Label>
              <Input
                data-ocid="settings.display_name.input"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <Button
              data-ocid="settings.save_profile.button"
              onClick={handleSaveProfile}
              disabled={saving}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Sun className="w-4 h-4 text-muted-foreground" />
              )}
              <CardTitle className="text-sm font-semibold">
                Appearance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">
                  {theme === "dark"
                    ? "Dark theme is active"
                    : "Light theme is active"}
                </p>
              </div>
              <Switch
                data-ocid="settings.dark_mode.switch"
                checked={theme === "dark"}
                onCheckedChange={onToggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Network</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Network</p>
                <p className="text-xs text-muted-foreground">
                  Internet Computer Mainnet
                </p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: "oklch(0.95 0.06 145)",
                  color: "oklch(0.4 0.15 145)",
                }}
              >
                Connected
              </span>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Supported Tokens
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: "oklch(0.96 0.008 240)" }}
                >
                  <img
                    src="/assets/generated/icp-token-transparent.dim_48x48.png"
                    alt="ICP"
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-xs font-semibold">ICP</span>
                </div>
                <div
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: "oklch(0.96 0.008 240)" }}
                >
                  <img
                    src="/assets/shby-019d6551-e049-714f-b3bf-3ef058287ba8.png"
                    alt="SHBY"
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-xs font-semibold">SHBY</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                Notifications
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Transaction Alerts</p>
                <p className="text-xs text-muted-foreground">
                  Get notified on incoming &amp; outgoing transfers
                </p>
              </div>
              <Switch
                data-ocid="settings.notifications.switch"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Authentication</p>
                <p className="text-xs text-muted-foreground">
                  Internet Identity (Web3)
                </p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: "oklch(0.95 0.06 145)",
                  color: "oklch(0.4 0.15 145)",
                }}
              >
                Active
              </span>
            </div>
            <Separator />
            <Button
              data-ocid="settings.disconnect.button"
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
