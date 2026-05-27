"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_BASE = "https://api.invoicequ.my.id/api/v1";
const DASHBOARD_URL = "https://app.invoicequ.my.id";

function SuccessContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "pro";
  const extId = searchParams.get("ext") || "";

  const [status, setStatus] = useState<"checking" | "activating" | "success" | "failed">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    verifyAndActivate();
  }, []);

  const verifyAndActivate = async () => {
    try {
      // Step 1: Check checkout status via public endpoint (triggers activation if paid)
      if (extId) {
        setStatus("checking");
        const statusRes = await fetch(`${API_BASE}/subscription/checkout/status/${extId}`);
        if (statusRes.ok) {
          const data = await statusRes.json();
          if (data.status === "paid") {
            setStatus("success");
            return;
          }
          if (data.status === "expired" || data.status === "failed") {
            setStatus("failed");
            setError("Pembayaran gagal atau kedaluwarsa.");
            return;
          }
        }
      }

      // If status is still pending, wait and retry a few times
      setStatus("activating");
      let attempts = 0;
      const maxAttempts = 6;

      const poll = async () => {
        while (attempts < maxAttempts) {
          attempts++;
          await new Promise(r => setTimeout(r, 3000));
          if (extId) {
            const res = await fetch(`${API_BASE}/subscription/checkout/status/${extId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.status === "paid") {
                setStatus("success");
                return;
              }
              if (data.status === "expired" || data.status === "failed") {
                setStatus("failed");
                setError("Pembayaran gagal atau kedaluwarsa.");
                return;
              }
            }
          }
        }
        // After max attempts, show success anyway (webhook may process later)
        setStatus("success");
      };

      await poll();
    } catch {
      // Even on error, show success — the webhook will handle activation
      setStatus("success");
    }
  };

  const planDisplayName = plan === "enterprise" ? "Enterprise" : plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/invoiceque.svg" alt="InvoiceQu" className="h-8 w-auto" />
            <span className="text-lg font-bold">InvoiceQu</span>
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-20">
        {(status === "checking" || status === "activating") && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-200/20 border-t-red-500 rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-3">
              {status === "checking" ? "Memverifikasi Pembayaran..." : "Mengaktifkan Paket..."}
            </h1>
            <p className="text-white/50">Mohon tunggu, kami sedang memproses pembayaran Anda.</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold mb-3">Pembayaran Berhasil! 🎉</h1>
            <p className="text-white/60 mb-2">
              Paket <span className="text-emerald-400 font-bold">{planDisplayName}</span> Anda telah aktif.
            </p>
            <p className="text-white/40 text-sm mb-8">
              Silakan login ke dashboard untuk mulai menggunakan semua fitur premium.
            </p>

            <a
              href={`${DASHBOARD_URL}/login`}
              className="inline-block w-full max-w-xs py-4 rounded-xl font-bold text-base bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5 transition-all duration-300 text-center no-underline"
            >
              Login ke Dashboard →
            </a>

            <p className="text-white/30 text-xs mt-4">
              Gunakan email dan password yang Anda buat saat checkout.
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">Pembayaran Gagal</h1>
            <p className="text-white/50 mb-6">{error || "Pembayaran tidak berhasil diproses."}</p>
            <Link
              href={`/checkout?plan=${plan}`}
              className="inline-block px-8 py-3 rounded-xl font-semibold bg-white/10 text-white hover:bg-white/20 transition-all no-underline"
            >
              Coba Lagi
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="w-10 h-10 border-4 border-red-200/20 border-t-red-500 rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
