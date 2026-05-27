import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Eye,
  Code2,
  Wand2,
  Bot,
  User,
  ArrowUp,
  Loader2,
  Check,
  Download,
  Printer,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type Search = { prompt?: string };

export const Route = createFileRoute("/build-invoice")({
  head: () => ({ meta: [{ title: "Building Invoice — CrimsonAI" }] }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  component: BuildInvoiceWorkspace,
});

type Msg = { role: "user" | "ai"; content: string };

const buildSteps = [
  "Memahami detail klien & item",
  "Menyusun line items",
  "Menghitung subtotal & pajak",
  "Menerapkan template & branding",
  "Menyiapkan PDF preview",
];

type LineItem = { desc: string; qty: number; price: number };

function generateInvoiceFromPrompt(prompt: string) {
  const lower = prompt.toLowerCase();
  const currency = lower.includes("usd") ? "USD" : lower.includes("eur") ? "EUR" : "IDR";
  const taxMatch = prompt.match(/(\d{1,2})\s*%/);
  const taxRate = taxMatch ? parseInt(taxMatch[1], 10) : 11;

  const amountMatch = prompt.match(/(?:rp|usd|eur|\$|€)?\s*([\d.,]+)/i);
  const baseAmount = amountMatch
    ? parseFloat(amountMatch[1].replace(/\./g, "").replace(",", ".")) || 5_000_000
    : 5_000_000;

  const items: LineItem[] = [
    { desc: prompt.slice(0, 60) || "Profesional service", qty: 1, price: baseAmount },
  ];
  if (lower.includes("subscription") || lower.includes("bulanan")) {
    items.push({ desc: "Setup & onboarding", qty: 1, price: Math.round(baseAmount * 0.1) });
  }
  if (lower.includes("ongkir")) {
    items.push({ desc: "Ongkos kirim", qty: 1, price: 150_000 });
  }

  return {
    number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    date: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
    due: new Date(Date.now() + 14 * 86400000).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    client: { name: "PT Mitra Sejahtera", email: "billing@mitra.co.id", address: "Jl. Sudirman 12, Jakarta" },
    issuer: { name: "CrimsonAI Studio", email: "hello@crimsonai.app", address: "Bandung, Indonesia" },
    items,
    currency,
    taxRate,
  };
}

function fmt(currency: string, n: number) {
  if (currency === "IDR") return `Rp ${n.toLocaleString("id-ID")}`;
  if (currency === "USD") return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  return `€${n.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
}

function BuildInvoiceWorkspace() {
  const { prompt } = Route.useSearch();
  const navigate = useNavigate();
  const initialPrompt = prompt ?? "Invoice baru";

  const invoice = useMemo(() => generateInvoiceFromPrompt(initialPrompt), [initialPrompt]);
  const subtotal = invoice.items.reduce((s, it) => s + it.qty * it.price, 0);
  const tax = Math.round((subtotal * invoice.taxRate) / 100);
  const total = subtotal + tax;

  const [messages, setMessages] = useState<Msg[]>([
    { role: "user", content: initialPrompt },
    { role: "ai", content: "Siap! Saya susun invoice-mu sekarang." },
  ]);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"preview" | "code">("preview");
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
      { role: "ai", content: "Update diterapkan ke invoice di kanan →" },
    ]);
    setInput("");
  };

  return (
    <div className="flex h-screen w-full flex-col bg-surface">
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/invoice" })}
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
            · {invoice.number}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" disabled={!done}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="hero" size="sm" disabled={!done}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[360px_1fr]">
        {/* Chat */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-soft">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </span>
            <div>
              <p className="text-sm font-semibold">Invoice Agent</p>
              <p className="text-xs text-muted-foreground">
                {done ? "Ready · minta perubahan" : "Membangun invoice…"}
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

            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Build steps</p>
              <ul className="space-y-1.5">
                {buildSteps.map((s, idx) => {
                  const state = idx < progress ? "done" : idx === progress ? "active" : "todo";
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
                      <span className={state === "todo" ? "text-muted-foreground" : "text-foreground"}>
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
                onClick={() => setTab("code")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "code" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
              >
                <Code2 className="h-3.5 w-3.5" /> JSON
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {done ? "Ready" : `Building ${Math.min(progress, buildSteps.length)}/${buildSteps.length}`}
            </span>
          </header>

          <div className="flex-1 overflow-auto bg-gradient-hero p-4 sm:p-8">
            {tab === "preview" ? (
              <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-border bg-background shadow-elegant">
                {!done ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {buildSteps[Math.min(progress, buildSteps.length - 1)]}…
                    </p>
                  </div>
                ) : (
                  <div className="p-8 sm:p-10">
                    {/* Invoice header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                          <Sparkles className="h-5 w-5 text-primary-foreground" />
                        </span>
                        <p className="mt-2 font-display text-lg font-bold">{invoice.issuer.name}</p>
                        <p className="text-xs text-muted-foreground">{invoice.issuer.email}</p>
                        <p className="text-xs text-muted-foreground">{invoice.issuer.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-2xl font-bold text-gradient">INVOICE</p>
                        <p className="mt-1 text-xs text-muted-foreground">{invoice.number}</p>
                        <p className="mt-2 text-xs"><span className="text-muted-foreground">Tanggal:</span> {invoice.date}</p>
                        <p className="text-xs"><span className="text-muted-foreground">Jatuh tempo:</span> {invoice.due}</p>
                      </div>
                    </div>

                    {/* Bill to */}
                    <div className="mt-8 rounded-lg border border-border bg-surface p-4">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tagihan untuk</p>
                      <p className="mt-1 font-semibold">{invoice.client.name}</p>
                      <p className="text-xs text-muted-foreground">{invoice.client.email}</p>
                      <p className="text-xs text-muted-foreground">{invoice.client.address}</p>
                    </div>

                    {/* Items */}
                    <table className="mt-6 w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="py-2">Deskripsi</th>
                          <th className="py-2 text-right">Qty</th>
                          <th className="py-2 text-right">Harga</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((it, i) => (
                          <tr key={i} className="border-b border-border/60">
                            <td className="py-3 pr-2">{it.desc}</td>
                            <td className="py-3 text-right">{it.qty}</td>
                            <td className="py-3 text-right">{fmt(invoice.currency, it.price)}</td>
                            <td className="py-3 text-right font-medium">{fmt(invoice.currency, it.qty * it.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{fmt(invoice.currency, subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Pajak ({invoice.taxRate}%)</span>
                        <span>{fmt(invoice.currency, tax)}</span>
                      </div>
                      <div className="mt-2 flex justify-between rounded-lg bg-gradient-primary px-3 py-2 font-semibold text-primary-foreground shadow-glow">
                        <span>Total</span>
                        <span>{fmt(invoice.currency, total)}</span>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
                      <p>Terima kasih atas kepercayaan Anda. Pembayaran dapat dilakukan melalui transfer bank ke rekening yang tertera. Untuk pertanyaan, hubungi {invoice.issuer.email}.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <pre className="h-full overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
{JSON.stringify({ invoice, subtotal, tax, total }, null, 2)}
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Suppress unused import warning
const _w = Wand2;
void _w;
