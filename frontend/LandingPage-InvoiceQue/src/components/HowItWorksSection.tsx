"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Daftar Akun Gratis",
    description:
      "Buat akun InvoiceQu dalam 30 detik. Tidak perlu kartu kredit — langsung mulai dengan paket gratis.",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Buat Invoice Pertama",
    description:
      "Pilih template, masukkan data klien dan item — invoice profesional siap dalam hitungan detik.",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Kirim ke Klien",
    description:
      "Bagikan invoice atau payment link via WhatsApp, email, atau salin link. Klien bisa bayar langsung dari link.",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Terima Pembayaran",
    description:
      "Klien membayar melalui payment link. Anda mendapat notifikasi real-time dan laporan otomatis update.",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Connector Line (not on last) */}
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-10 left-[calc(100%+0px)] w-full h-[1px]">
          <div className="h-full bg-gradient-to-r from-red-500/30 to-transparent" />
        </div>
      )}

      <div className="glass-card rounded-2xl p-7 text-center relative overflow-hidden group">
        {/* Step Number Background */}
        <div className="absolute -top-4 -right-4 text-[100px] font-black text-white/[0.02] leading-none select-none">
          {step.number}
        </div>

        <div className="relative z-10">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-5 group-hover:bg-red-500/20 transition-colors">
            {step.icon}
          </div>

          {/* Step Badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 text-xs font-bold text-red-400 mb-4">
            LANGKAH {step.number}
          </div>

          <h3 className="text-lg font-bold text-white mb-3">{step.title}</h3>
          <p className="text-sm text-white/50 leading-relaxed">{step.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksSection() {
  return (
    <section id="cara-kerja" className="relative py-28 md:py-36">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(220,38,38,0.05),transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-red-400 mb-5">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            CARA KERJA
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">
            Mulai dalam{" "}
            <span className="text-gradient-red">4 Langkah Mudah</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 leading-relaxed">
            Tidak perlu setup rumit. Daftar, buat invoice, kirim, dan terima pembayaran —
            semua bisa dilakukan dari browser Anda.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
