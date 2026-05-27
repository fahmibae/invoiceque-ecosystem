import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Bot, User, ArrowUp, Receipt, Repeat, Globe2, Briefcase } from "lucide-react";
import { AppTopbar } from "@/components/app-topbar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/invoice")({
  head: () => ({ meta: [{ title: "AI Invoice Builder — CrimsonAI" }] }),
  component: InvoicePage,
});

type Msg = { role: "user" | "ai"; content: string };

const initialMessages: Msg[] = [
  {
    role: "ai",
    content:
      "Hai! Saya AI Invoice Builder. Ceritakan invoice yang ingin dibuat — klien, item, mata uang, pajak, dan termin pembayaran. Saya akan generate invoice profesional siap kirim.",
  },
];

const ideas = [
  { icon: Briefcase, label: "Invoice jasa desain web Rp 5.000.000 untuk PT Mitra" },
  { icon: Repeat, label: "Invoice subscription bulanan SaaS, PPN 11%" },
  { icon: Globe2, label: "Invoice freelance USD untuk klien luar negeri" },
  { icon: Receipt, label: "Invoice produk fisik dengan diskon dan ongkir" },
];

function InvoicePage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: value },
      {
        role: "ai",
        content:
          "Mantap. Saya susun header invoice, line items, perhitungan pajak & total, lalu buka workspace full-screen…",
      },
    ]);
    setInput("");
    setTimeout(() => {
      navigate({ to: "/build-invoice", search: { prompt: value } });
    }, 600);
  };

  return (
    <>
      <AppTopbar title="AI Invoice Builder" />
      <main className="flex-1">
        <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-6">
          <div className="flex-1 space-y-5 overflow-y-auto pb-6 no-scrollbar">
            {messages.length === 1 && (
              <div className="pt-6 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                  <FileText className="h-6 w-6 text-primary-foreground" />
                </span>
                <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
                  Bangun <span className="text-gradient">invoice</span> dalam hitungan detik
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Deskripsikan klien & item — AI generate invoice profesional, lengkap dengan pajak.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${m.role === "ai"
                    ? "bg-gradient-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                    }`}
                >
                  {m.role === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "ai"
                    ? "bg-muted text-foreground"
                    : "bg-gradient-primary text-primary-foreground shadow-glow"
                    }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {messages.length === 1 && (
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              {ideas.map((it) => (
                <button
                  key={it.label}
                  onClick={() => send(it.label)}
                  className="group flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm transition-all hover:border-primary/40 hover:shadow-soft"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-primary group-hover:bg-primary/10">
                    <it.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-foreground">{it.label}</span>
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="rounded-2xl border border-border bg-card p-2 shadow-soft focus-within:border-primary/40 focus-within:shadow-glow"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={2}
                placeholder="Contoh: Invoice jasa konsultasi 10 jam @ Rp 750.000 untuk PT Sinar, PPN 11%, jatuh tempo 14 hari…"
                className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" variant="hero" size="icon" aria-label="Kirim" disabled={!input.trim()}>
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3 text-primary" /> Invoice agent · IDR/USD/EUR
              </span>
              <span>Enter untuk kirim · Shift+Enter baris baru</span>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
