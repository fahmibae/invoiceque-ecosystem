import { createFileRoute } from "@tanstack/react-router";
import { Globe, MoreHorizontal, Plus, Search, Clock, ExternalLink } from "lucide-react";
import { AppTopbar } from "@/components/app-topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/projects")({
  head: () => ({ meta: [{ title: "Projects — CrimsonAI" }] }),
  component: ProjectsPage,
});

const projects = [
  { name: "Northwave Landing", status: "Live", updated: "2h ago", domain: "northwave.io", views: "12.4K" },
  { name: "Aria Portfolio", status: "Draft", updated: "1d ago", domain: "—", views: "—" },
  { name: "Lumen SaaS", status: "Live", updated: "3d ago", domain: "lumen.app", views: "8.1K" },
  { name: "Ember Blog", status: "Building", updated: "5m ago", domain: "—", views: "—" },
  { name: "Petal Florist", status: "Live", updated: "1w ago", domain: "petal.shop", views: "3.6K" },
  { name: "Forge Studio", status: "Draft", updated: "2w ago", domain: "—", views: "—" },
];

const statusStyle = (s: string) =>
  s === "Live"
    ? "bg-primary/10 text-primary"
    : s === "Building"
      ? "bg-accent text-accent-foreground"
      : "bg-muted text-muted-foreground";

function ProjectsPage() {
  return (
    <>
      <AppTopbar title="Projects" />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search projects…" />
          </div>
          <Button variant="hero" size="lg">
            <Plus className="h-4 w-4" /> New project
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.name}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <Globe className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{p.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">{p.domain}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label="More">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ${statusStyle(p.status)}`}>
                  {p.status}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {p.updated}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
                <span className="text-muted-foreground">{p.views} views</span>
                <Button variant="ghost" size="sm">
                  Open <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
