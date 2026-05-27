import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Filter } from "lucide-react";
import { AppTopbar } from "@/components/app-topbar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/templates")({
  head: () => ({ meta: [{ title: "Templates — CrimsonAI" }] }),
  component: TemplatesPage,
});

const categories = ["All", "Landing", "Portfolio", "SaaS", "Blog", "E-commerce", "Restaurant"];

const templates = [
  { name: "Halo SaaS", cat: "SaaS", grad: "from-rose-500 to-red-700" },
  { name: "Mono Studio", cat: "Portfolio", grad: "from-red-600 to-orange-500" },
  { name: "Brewline", cat: "Restaurant", grad: "from-rose-400 to-pink-600" },
  { name: "Pulse Blog", cat: "Blog", grad: "from-red-700 to-rose-900" },
  { name: "Northwave", cat: "Landing", grad: "from-pink-500 to-red-600" },
  { name: "Petal Shop", cat: "E-commerce", grad: "from-rose-300 to-red-500" },
  { name: "Forge", cat: "Portfolio", grad: "from-red-500 to-rose-700" },
  { name: "Lumen", cat: "SaaS", grad: "from-orange-500 to-red-600" },
];

function TemplatesPage() {
  return (
    <>
      <AppTopbar title="Templates" />
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h2 className="font-display text-2xl font-bold">Start from a template</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a starter, then refine it with AI in the builder.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c, i) => (
            <button
              key={c}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                i === 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
          <Button variant="ghost" size="sm" className="ml-auto">
            <Filter className="h-4 w-4" /> Filter
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((t) => (
            <div
              key={t.name}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-elegant"
            >
              <div
                className={`relative aspect-[4/3] bg-gradient-to-br ${t.grad} p-4`}
              >
                <div className="absolute inset-0 bg-gradient-glow opacity-50" />
                <div className="relative flex h-full flex-col justify-between text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                  <div>
                    <div className="h-2 w-12 rounded-full bg-primary-foreground/40" />
                    <div className="mt-1.5 h-2 w-20 rounded-full bg-primary-foreground/30" />
                    <div className="mt-1.5 h-2 w-16 rounded-full bg-primary-foreground/20" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.cat}</p>
                </div>
                <Button variant="hero" size="sm">
                  Use
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
