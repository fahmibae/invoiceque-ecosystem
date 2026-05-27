import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Eye,
  Code2,
  Smartphone,
  Monitor,
  Wand2,
  Bot,
  User,
  ArrowUp,
  Loader2,
  Check,
  Workflow,
  Database,
  Zap,
  Globe,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type Search = { prompt?: string };

export const Route = createFileRoute("/build")({
  head: () => ({ meta: [{ title: "Building — CrimsonAI" }] }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  component: BuildWorkspace,
});

type Msg = { role: "user" | "ai"; content: string };

const buildSteps = [
  "Menganalisis prompt",
  "Memilih design system",
  "Generate struktur halaman",
  "Menulis komponen UI",
  "Menerapkan brand colors",
  "Finalisasi preview",
];

function BuildWorkspace() {
  const { prompt } = Route.useSearch();
  const navigate = useNavigate();
  const initialPrompt = prompt ?? "Website baru";

  const [messages, setMessages] = useState<Msg[]>([
    { role: "user", content: initialPrompt },
    { role: "ai", content: "Siap! Saya mulai membangun website-mu sekarang." },
  ]);
  const [input, setInput] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [tab, setTab] = useState<"preview" | "flow" | "code">("preview");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (progress >= buildSteps.length) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setProgress((p) => p + 1), 700);
    return () => clearTimeout(t);
  }, [progress]);

  const send = (text: string) => {
    const v = text.trim();
    if (!v) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: v },
      { role: "ai", content: "Update diterapkan ke preview di kanan →" },
    ]);
    setInput("");
  };

  return (
    <div className="flex h-screen w-full flex-col bg-surface">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/builder" })}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Keluar
          </Button>
          <span className="hidden h-5 w-px bg-border sm:block" />
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="hidden font-display text-sm font-bold sm:inline">
              Crims<span className="text-gradient">on</span>AI
            </span>
          </Link>
          <span className="ml-2 hidden truncate text-xs text-muted-foreground sm:inline">
            · {initialPrompt}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden rounded-lg border border-border bg-surface p-0.5 sm:inline-flex">
            <button
              onClick={() => setDevice("desktop")}
              className={`rounded-md p-1.5 ${device === "desktop" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
              aria-label="Desktop"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={`rounded-md p-1.5 ${device === "mobile" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
              aria-label="Mobile"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
          <ThemeToggle />
          <Button variant="hero" size="sm" disabled={!done}>
            <Wand2 className="h-4 w-4" /> Publish
          </Button>
        </div>
      </header>

      {/* Workspace */}
      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[360px_1fr]">
        {/* Chat */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-soft">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            <div>
              <p className="text-sm font-semibold">AI Agent</p>
              <p className="text-xs text-muted-foreground">
                {done ? "Ready · ask for changes" : "Building your site…"}
              </p>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    m.role === "ai"
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.role === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "ai"
                      ? "bg-muted text-foreground"
                      : "bg-gradient-primary text-primary-foreground shadow-glow"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Build progress */}
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Build steps</p>
              <ul className="space-y-1.5">
                {buildSteps.map((s, idx) => {
                  const state =
                    idx < progress ? "done" : idx === progress ? "active" : "todo";
                  return (
                    <li key={s} className="flex items-center gap-2 text-xs">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full ${
                          state === "done"
                            ? "bg-primary text-primary-foreground"
                            : state === "active"
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {state === "done" ? (
                          <Check className="h-3 w-3" />
                        ) : state === "active" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span
                        className={
                          state === "todo" ? "text-muted-foreground" : "text-foreground"
                        }
                      >
                        {s}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <form
            className="border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-xl border border-border bg-surface p-1.5 focus-within:border-primary/40">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={1}
                placeholder="Minta perubahan…"
                className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" variant="hero" size="icon" aria-label="Kirim">
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </section>

        {/* Preview */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-soft">
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "preview" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button
                onClick={() => setTab("flow")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "flow" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
              >
                <Workflow className="h-3.5 w-3.5" /> Orchestration
              </button>
              <button
                onClick={() => setTab("code")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "code" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
              >
                <Code2 className="h-3.5 w-3.5" /> Code
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {done ? "Ready" : `Building ${Math.min(progress, buildSteps.length)}/${buildSteps.length}`}
            </span>
          </header>

          <div className="flex-1 overflow-auto bg-gradient-hero p-4 sm:p-8">
            {tab === "preview" ? (
              <div
                className={`mx-auto h-full overflow-hidden rounded-xl border border-border bg-background shadow-elegant transition-all ${device === "mobile" ? "max-w-sm" : "max-w-full"}`}
              >
                <div className="flex items-center gap-1.5 border-b border-border bg-surface px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    preview.crimsonai.app
                  </span>
                </div>
                {!done ? (
                  <div className="flex h-[calc(100%-2.25rem)] flex-col items-center justify-center gap-3 p-10 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {buildSteps[Math.min(progress, buildSteps.length - 1)]}…
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 p-6 sm:p-10">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                      <Sparkles className="h-3 w-3" /> Generated by AI
                    </div>
                    <h2 className="font-display text-3xl font-bold sm:text-5xl">
                      {initialPrompt.split(" ").slice(0, 4).join(" ")},{" "}
                      <span className="text-gradient">dibangun untukmu</span>.
                    </h2>
                    <p className="max-w-xl text-muted-foreground">
                      Halaman ini dihasilkan dari prompt-mu. Minta perubahan kapan saja melalui chat di kiri.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="hero" size="lg">Get Started</Button>
                      <Button variant="outline" size="lg">Pelajari lebih</Button>
                    </div>
                    <div className="grid gap-3 pt-4 sm:grid-cols-3">
                      {["Cepat", "Modern", "Responsive"].map((f) => (
                        <div
                          key={f}
                          className="rounded-xl border border-border bg-card p-4 text-sm"
                        >
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : tab === "flow" ? (
              <OrchestrationView prompt={initialPrompt} done={done} />
            ) : (
              <pre className="h-full overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
{`<section className="hero">
  <Badge>Generated by AI</Badge>
  <h1>${initialPrompt}</h1>
  <p>Dibangun otomatis oleh CrimsonAI…</p>
  <Button variant="hero">Get Started</Button>
</section>`}
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function OrchestrationView({ prompt, done }: { prompt: string; done: boolean }) {
  const lower = prompt.toLowerCase();
  const isEcom = /toko|shop|store|product|jual|ecom/.test(lower);
  const isSaas = /saas|dashboard|admin|analytics|platform/.test(lower);
  const isContent = /portfolio|blog|landing|portofolio/.test(lower);

  const steps = isEcom
    ? [
        { actor: "User", action: "Browse katalog", icon: User },
        { actor: "Frontend", action: "Fetch products", icon: Globe },
        { actor: "Database", action: "Query stock + harga", icon: Database },
        { actor: "AI Agent", action: "Rekomendasi personal", icon: Bot },
        { actor: "Payment", action: "Checkout & verifikasi", icon: Shield },
        { actor: "Webhook", action: "Update order + email", icon: Zap },
      ]
    : isSaas
      ? [
          { actor: "User", action: "Login ke dashboard", icon: User },
          { actor: "Auth", action: "Verify session + role", icon: Shield },
          { actor: "Frontend", action: "Render workspace", icon: Globe },
          { actor: "Database", action: "Load data tenant", icon: Database },
          { actor: "AI Agent", action: "Insight & summary", icon: Bot },
          { actor: "Realtime", action: "Push update ke UI", icon: Zap },
        ]
      : isContent
        ? [
            { actor: "Visitor", action: "Buka halaman", icon: User },
            { actor: "CDN", action: "Serve halaman cached", icon: Globe },
            { actor: "AI Agent", action: "Personalize konten", icon: Bot },
            { actor: "Form", action: "Submit lead/contact", icon: Zap },
            { actor: "Database", action: "Simpan lead", icon: Database },
            { actor: "Email", action: "Notify owner", icon: Shield },
          ]
        : [
            { actor: "User", action: "Masuk aplikasi", icon: User },
            { actor: "Frontend", action: "Render UI", icon: Globe },
            { actor: "AI Agent", action: "Proses prompt", icon: Bot },
            { actor: "Database", action: "Persist state", icon: Database },
            { actor: "Webhook", action: "Trigger otomasi", icon: Zap },
          ];

  if (!done) {
    return (
      <div className="mx-auto flex h-full max-w-3xl items-center justify-center rounded-xl border border-border bg-background">
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Menyiapkan diagram orchestration…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-xl border border-border bg-background p-6 sm:p-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Business flow & orchestration
        </p>
        <h3 className="mt-1 font-display text-xl font-bold sm:text-2xl">
          Bagaimana <span className="text-gradient">aplikasimu</span> bekerja
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualisasi alur antara user, frontend, AI agent, database, dan layanan eksternal.
        </p>
      </div>

      {/* Vertical flow */}
      <ol className="relative space-y-3 border-l-2 border-dashed border-border pl-6">
        {steps.map((s, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[34px] flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              <s.icon className="h-3.5 w-3.5" />
            </span>
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Step {i + 1} · {s.actor}
                </p>
                <span className="text-[10px] text-muted-foreground">~{(i + 1) * 120}ms</span>
              </div>
              <p className="mt-1 text-sm text-foreground">{s.action}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Architecture pills */}
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Arsitektur
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { label: "React + TanStack", icon: Globe },
            { label: "AI Gateway", icon: Bot },
            { label: "Postgres", icon: Database },
            { label: "Auth + RLS", icon: Shield },
            { label: "Edge Functions", icon: Zap },
          ].map((p, i, arr) => (
            <div key={p.label} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
                <p.icon className="h-3 w-3 text-primary" />
                {p.label}
              </span>
              {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Agent orchestration */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
          AI Agent Orchestration
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { name: "Planner", desc: "Memecah goal jadi langkah" },
            { name: "Builder", desc: "Generate UI & logic" },
            { name: "Reviewer", desc: "Validasi & QA otomatis" },
          ].map((a) => (
            <div key={a.name} className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-semibold text-foreground">{a.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
