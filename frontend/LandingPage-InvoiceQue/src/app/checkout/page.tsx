"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_BASE = "https://api.invoicequ.my.id/api/v1";

// ── Plan data ──
const plansData: Record<string, {
  id: string; displayName: string; price: number; priceLabel: string;
  desc: string; badge: string; badgeColor: string; accentColor: string;
  features: string[]; limits: { invoices: string; clients: string; paymentLinks: string };
}> = {
  pro: {
    id: "plan_pro", displayName: "Pro", price: 99000, priceLabel: "Rp 99.000",
    desc: "Untuk bisnis yang berkembang dengan kebutuhan lebih.",
    badge: "🔥 Paling Populer", badgeColor: "bg-red-500/10 text-red-400", accentColor: "text-red-400",
    features: ["Custom Branding", "Integrasi Xendit", "Prioritas Support", "Notifikasi Email"],
    limits: { invoices: "100", clients: "500", paymentLinks: "100" },
  },
};

// ── Enterprise token decoder ──
function decodeToken(token: string): { amount: number; label: string; desc: string; exp: number } | null {
  try {
    const inner = token.replace(/^iq_/, "").replace(/_ent$/, "");
    const b64 = inner.split("").reverse().join("");
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch { return null; }
}

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

// ── Shared input class ──
const inputCls = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all";

type Step = "form" | "processing" | "redirecting";

// ═══════════════════════════════════════════
//  MAIN CONTENT
// ═══════════════════════════════════════════
function CheckoutContent() {
  const searchParams = useSearchParams();
  const planKey = searchParams.get("plan") || "pro";
  const token = searchParams.get("token");

  // Resolve enterprise from token
  const enterprise = planKey === "enterprise" && token ? decodeToken(token) : null;

  // Check enterprise expiry
  const isExpired = enterprise ? Date.now() > enterprise.exp : false;

  // Build plan info
  const plan = planKey === "enterprise" && enterprise ? {
    id: "plan_enterprise", displayName: enterprise.label, price: enterprise.amount,
    priceLabel: formatRupiah(enterprise.amount),
    desc: enterprise.desc || "Paket Enterprise Custom",
    badge: "⭐ Enterprise", badgeColor: "bg-orange-500/10 text-orange-400", accentColor: "text-orange-400",
    features: ["Unlimited Invoice", "Unlimited Klien", "Unlimited Payment Link", "API Access", "Dedicated Support", "SLA Agreement"],
    limits: { invoices: "Unlimited", clients: "Unlimited", paymentLinks: "Unlimited" },
  } : plansData[planKey];

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  // ── Invalid states ──
  if (!plan) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Paket tidak ditemukan</h1>
          <Link href="/#harga" className="text-red-400 hover:text-red-300 underline">Kembali ke halaman harga</Link>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-white">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold mb-3">Link Sudah Kedaluwarsa</h1>
          <p className="text-white/50 mb-6">Link checkout Enterprise ini sudah tidak berlaku. Silakan hubungi tim Sales untuk mendapatkan link baru.</p>
          <a href="https://wa.me/6281234567890" target="_blank" className="inline-block px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">Hubungi Sales via WhatsApp</a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Password dan konfirmasi password tidak cocok."); return; }
    if (password.length < 6) { setError("Password minimal 6 karakter."); return; }

    setStep("processing");
    try {
      // Register
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company: company || undefined, phone: phone || undefined }),
      });
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({ error: "Registrasi gagal" }));
        throw new Error(err.error || err.message || "Registrasi gagal");
      }
      const { token: authToken } = await regRes.json();

      // Checkout
      const checkoutRes = await fetch(`${API_BASE}/subscriptions/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      if (!checkoutRes.ok) {
        const err = await checkoutRes.json().catch(() => ({ error: "Checkout gagal" }));
        throw new Error(err.error || err.message || "Checkout gagal");
      }
      const { checkout_url } = await checkoutRes.json();
      if (!checkout_url) throw new Error("Tidak ada URL pembayaran");

      setStep("redirecting");
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setStep("form");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/invoiceque.svg" alt="InvoiceQu" className="h-8 w-auto" />
            <span className="text-lg font-bold">InvoiceQu</span>
          </Link>
          <Link href="/#harga" className="text-sm text-white/50 hover:text-white transition-colors">← Kembali ke Harga</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">

          {/* ── Left: Plan Summary ── */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="lg:sticky lg:top-8">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-7">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${plan.badgeColor}`}>{plan.badge}</span>
                <h2 className="text-2xl font-extrabold mt-3 mb-1">Paket {plan.displayName}</h2>
                <p className="text-white/40 text-sm mb-6">{plan.desc}</p>

                <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-white/10">
                  <span className={`text-4xl font-extrabold ${plan.accentColor}`}>{plan.priceLabel}</span>
                  <span className="text-white/40 text-sm">/ bulan</span>
                </div>

                <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
                  <h4 className="text-xs font-semibold text-white/30 uppercase tracking-wider">Kuota</h4>
                  <div className="flex items-center gap-3 text-sm"><span className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-base">📄</span>{plan.limits.invoices} Invoice</div>
                  <div className="flex items-center gap-3 text-sm"><span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-base">👥</span>{plan.limits.clients} Klien</div>
                  <div className="flex items-center gap-3 text-sm"><span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-base">🔗</span>{plan.limits.paymentLinks} Payment Link</div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-white/30 uppercase tracking-wider">Fitur</h4>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>{f}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-white/30">Pembayaran via Xendit · QRIS, VA, E-Wallet, Kartu Kredit</div>
            </div>
          </div>

          {/* ── Right: Form ── */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                Daftar <span className="text-gradient-red">Paket {plan.displayName}</span>
              </h1>
              <p className="text-white/50">Buat akun dan langsung lanjutkan ke pembayaran.</p>
            </div>

            {step === "processing" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center">
                <div className="w-14 h-14 border-4 border-red-200/20 border-t-red-500 rounded-full animate-spin mx-auto mb-5" />
                <h3 className="text-xl font-bold mb-2">Memproses Pendaftaran...</h3>
                <p className="text-white/40 text-sm">Membuat akun dan menyiapkan halaman pembayaran</p>
              </div>
            )}

            {step === "redirecting" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center">
                <div className="w-14 h-14 border-4 border-emerald-200/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-5" />
                <h3 className="text-xl font-bold mb-2">Mengalihkan ke Pembayaran...</h3>
                <p className="text-white/40 text-sm">Anda akan segera diarahkan ke halaman pembayaran Xendit</p>
              </div>
            )}

            {step === "form" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Nama Lengkap <span className="text-red-400">*</span></label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nama Anda" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Email <span className="text-red-400">*</span></label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="email@company.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Perusahaan <span className="text-white/30">(opsional)</span></label>
                    <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Nama perusahaan" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">No. Telepon <span className="text-white/30">(opsional)</span></label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+62 812 3456 7890" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input type={showPw ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-12`} placeholder="Minimal 6 karakter" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-sm">{showPw ? "🙈" : "👁️"}</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Konfirmasi Password <span className="text-red-400">*</span></label>
                    <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Ulangi password" />
                  </div>
                </div>

                {/* Order Summary */}
                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 mt-2">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-white/50">Paket {plan.displayName}</span>
                    <span className="font-semibold">{plan.priceLabel}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-3 pb-3 border-b border-white/10">
                    <span className="text-white/50">Periode</span>
                    <span className="text-white/70">Bulanan</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className={`text-lg font-extrabold ${plan.accentColor}`}>{plan.priceLabel}</span>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border-none">
                  Daftar & Bayar Sekarang
                </button>

                <p className="text-xs text-center text-white/30">
                  Dengan mendaftar, Anda menyetujui <Link href="/syarat-ketentuan" className="text-red-400/70 hover:text-red-400">Syarat & Ketentuan</Link> serta <Link href="/privasi" className="text-red-400/70 hover:text-red-400">Kebijakan Privasi</Link> kami.
                </p>
                <div className="text-center text-sm text-white/40 pt-2">
                  Sudah punya akun?{" "}
                  <a href="https://app.invoicequ.my.id/login" className="text-red-400 hover:text-red-300 font-medium">Masuk & upgrade dari dashboard</a>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="w-10 h-10 border-4 border-red-200/20 border-t-red-500 rounded-full animate-spin" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
