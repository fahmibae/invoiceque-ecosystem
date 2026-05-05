"use client";

import { useState } from "react";
import Link from "next/link";

function encodeToken(data: { amount: number; label: string; desc: string; exp: number }): string {
  const json = JSON.stringify(data);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  // Shuffle to obfuscate: reverse + prefix
  const reversed = b64.split("").reverse().join("");
  return "iq_" + reversed + "_ent";
}

export default function AdminEnterprisePage() {
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("Enterprise");
  const [desc, setDesc] = useState("");
  const [expDays, setExpDays] = useState("7");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || numAmount < 1000) {
      alert("Nominal harus lebih dari Rp 1.000");
      return;
    }

    const expTimestamp = Date.now() + parseInt(expDays) * 24 * 60 * 60 * 1000;
    const token = encodeToken({
      amount: numAmount,
      label: label || "Enterprise",
      desc: desc || "Paket Enterprise Custom",
      exp: expTimestamp,
    });

    const link = `https://invoicequ.my.id/checkout?plan=enterprise&token=${token}`;
    setGeneratedLink(link);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <header className="border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/invoiceque.svg" alt="InvoiceQue" className="h-8 w-auto" />
            <span className="text-lg font-bold">InvoiceQue</span>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Generate Link Enterprise</h1>
          <p className="text-white/40">Buat link checkout custom untuk klien Enterprise. Nominal akan di-encode agar tidak terlihat di URL.</p>
        </div>

        <form onSubmit={handleGenerate} className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 space-y-5 mb-8">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Nominal (IDR) <span className="text-red-400">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">Rp</span>
              <input
                type="text"
                required
                value={formatRupiah(amount)}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all text-lg font-semibold"
                placeholder="500.000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Label Paket</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
                placeholder="Enterprise"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Berlaku (hari)</label>
              <select
                value={expDays}
                onChange={(e) => setExpDays(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
              >
                <option value="3" className="bg-[#18181b]">3 Hari</option>
                <option value="7" className="bg-[#18181b]">7 Hari</option>
                <option value="14" className="bg-[#18181b]">14 Hari</option>
                <option value="30" className="bg-[#18181b]">30 Hari</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Deskripsi <span className="text-white/30">(opsional)</span></label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all resize-none"
              placeholder="Paket Enterprise custom untuk PT ..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border-none"
          >
            🔗 Generate Link Checkout
          </button>
        </form>

        {generatedLink && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span>✅</span> Link Berhasil Di-generate
            </div>

            <div className="bg-black/40 rounded-xl p-4 break-all text-sm text-white/70 font-mono leading-relaxed">
              {generatedLink}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer border-none"
              >
                {copied ? "✓ Tersalin!" : "📋 Copy Link"}
              </button>
              <a
                href={generatedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all text-center"
              >
                🔍 Preview
              </a>
            </div>

            <p className="text-xs text-white/30 text-center">
              Kirimkan link ini ke klien via WhatsApp atau Email. Link berlaku {expDays} hari.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
