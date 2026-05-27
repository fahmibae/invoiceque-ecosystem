import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { AppTopbar } from "@/components/app-topbar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/help")({
  head: () => ({ meta: [{ title: "Help — CrimsonAI" }] }),
  component: HelpPage,
});

const items = [
  { icon: BookOpen, title: "Documentation", desc: "Guides, tutorials, and API references." },
  { icon: MessageCircle, title: "Community", desc: "Chat with thousands of CrimsonAI builders." },
  { icon: LifeBuoy, title: "Contact support", desc: "Get help from our team within 24 hours." },
  { icon: Sparkles, title: "What's new", desc: "Latest features and improvements." },
];

function HelpPage() {
  return (
    <>
      <AppTopbar title="Help" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold">How can we help?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Find answers, reach the team, or explore the docs.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((it) => (
              <button
                key={it.title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                  <it.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{it.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-primary/30 bg-gradient-primary/10 p-6 text-center">
            <h3 className="font-display text-xl font-semibold">Still stuck?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Our support team responds within a few hours.
            </p>
            <Button variant="hero" className="mt-4">Contact support</Button>
          </div>
        </div>
      </main>
    </>
  );
}
