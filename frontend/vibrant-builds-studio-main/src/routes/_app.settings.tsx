import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/app-topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — CrimsonAI" }] }),
  component: SettingsPage,
});

const tabs = ["Profile", "Workspace", "Billing", "Appearance"] as const;
type Tab = (typeof tabs)[number];

function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Profile");
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <AppTopbar title="Settings" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            {tab === "Profile" && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">Profile</h2>
                  <p className="text-sm text-muted-foreground">Update your personal info.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-primary shadow-glow" />
                  <Button variant="outline" size="sm">Change avatar</Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" defaultValue="Maya Reyes" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="maya@northwave.io" />
                  </div>
                </div>
                <Button variant="hero">Save changes</Button>
              </div>
            )}

            {tab === "Workspace" && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">Workspace</h2>
                  <p className="text-sm text-muted-foreground">Configure your workspace.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws">Workspace name</Label>
                  <Input id="ws" defaultValue="Northwave Studio" />
                </div>
                <Button variant="hero">Save</Button>
              </div>
            )}

            {tab === "Billing" && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">Billing</h2>
                  <p className="text-sm text-muted-foreground">You are on the Free plan.</p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-gradient-primary/10 p-5">
                  <p className="font-semibold">Free</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    62 / 100 AI credits used this month.
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[62%] bg-gradient-primary" />
                  </div>
                  <Button variant="hero" className="mt-4">Upgrade to Pro</Button>
                </div>
              </div>
            )}

            {tab === "Appearance" && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">Appearance</h2>
                  <p className="text-sm text-muted-foreground">Switch between light and dark.</p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-muted-foreground capitalize">{theme} mode</p>
                  </div>
                  <Button variant="outline" onClick={toggleTheme}>Toggle</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
