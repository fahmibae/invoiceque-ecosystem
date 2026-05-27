import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Wand2,
  Send,
  TrendingUp,
  Globe,
  Eye,
  MousePointerClick,
  Plus,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { AppTopbar } from "@/components/app-topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [{ title: "Overview — CrimsonAI" }],
  }),
  component: OverviewPage,
});

const stats = [
  { label: "Active sites", value: "8", delta: "+2 this week", icon: Globe },
  { label: "Page views", value: "24.1K", delta: "+12.4%", icon: Eye },
  { label: "Conversions", value: "342", delta: "+8.1%", icon: MousePointerClick },
  { label: "AI credits used", value: "62 / 100", delta: "Resets in 12d", icon: TrendingUp },
];

const recent = [
  { name: "Northwave Landing", status: "Live", updated: "2h ago" },
  { name: "Aria Portfolio", status: "Draft", updated: "1d ago" },
  { name: "Lumen SaaS", status: "Live", updated: "3d ago" },
  { name: "Ember Blog", status: "Building", updated: "5m ago" },
];

const activity = [
  { who: "AI Agent", what: "deployed", target: "Northwave Landing", when: "2h ago" },
  { who: "You", what: "edited hero on", target: "Lumen SaaS", when: "5h ago" },
  { who: "AI Agent", what: "generated copy for", target: "Ember Blog", when: "1d ago" },
  { who: "You", what: "created project", target: "Aria Portfolio", when: "2d ago" },
];

function OverviewPage() {
  const [prompt, setPrompt] = useState("");

  return (
    <>
      <AppTopbar title="Overview" />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Quick build card */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-glow blur-3xl" aria-hidden />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Wand2 className="h-3.5 w-3.5" /> Quick build
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
              What do you want to build?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe your idea — CrimsonAI handles the rest.
            </p>
            <form
              className="mt-5 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A landing page for a coffee subscription brand…"
                className="h-12 flex-1 text-base"
              />
              <Button asChild type="submit" variant="hero" size="lg">
                <Link to="/builder">
                  <Send className="h-4 w-4" /> Generate
                </Link>
              </Button>
            </form>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{s.delta}</p>
            </div>
          ))}
        </div>

        {/* Recent + Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Recent projects</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/projects">
                  View all <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {recent.map((p) => (
                <li key={p.name} className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {p.updated}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.status === "Live"
                        ? "bg-primary/10 text-primary"
                        : p.status === "Building"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 font-display text-lg font-semibold">Activity</h3>
            <ul className="space-y-4">
              {activity.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug">
                      <span className="font-medium">{a.who}</span>{" "}
                      <span className="text-muted-foreground">{a.what}</span>{" "}
                      <span className="font-medium">{a.target}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.when}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              <Plus className="h-4 w-4" /> New project
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
