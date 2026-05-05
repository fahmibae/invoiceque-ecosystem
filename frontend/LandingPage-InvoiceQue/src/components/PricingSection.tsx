"use client";

import { useEffect, useRef, useState } from "react";

const plans = [
  {
    name: "Free",
    description: "Untuk freelancer dan bisnis kecil yang baru mulai.",
    price: "Gratis",
    priceNote: "Selamanya",
    features: [
      "5 Invoice",
      "10 Klien",
      "5 Payment Link",
      "Invoicing Dasar",
      "Notifikasi Email",
    ],
    cta: "Mulai Gratis",
    ctaLink: "https://app.invoicequ.my.id/register",
    popular: false,
    gradient: "from-white/5 to-white/[0.02]",
  },
  {
    name: "Pro",
    description: "Untuk bisnis yang berkembang dengan kebutuhan lebih.",
    price: "Rp 99K",
    priceNote: "/ bulan",
    features: [
      "100 Invoice",
      "500 Klien",
      "100 Payment Link",
      "Custom Branding",
      "Integrasi Xendit",
      "Integrasi Paypal",
      "Prioritas Support",
    ],
    cta: "Daftar Pro",
    ctaLink: "/checkout?plan=pro",
    popular: true,
    gradient: "from-red-500/10 to-red-600/5",
  },
  {
    name: "Enterprise",
    description: "Untuk perusahaan dengan volume transaksi tinggi.",
    price: "Custom",
    priceNote: "Hubungi Kami",
    features: [
      "Unlimited Invoice",
      "Unlimited Klien",
      "Unlimited Payment Link",
      "API Access",
      "Dedicated Support",
      "SLA Agreement",
    ],
    cta: "Hubungi Sales",
    ctaLink: "#kontak",
    popular: false,
    gradient: "from-white/5 to-white/[0.02]",
  },
];

function PricingCard({
  plan,
  index,
}: {
  plan: (typeof plans)[0];
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
      { threshold: 0.15 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        } ${plan.popular ? "lg:-mt-4 lg:mb-0" : ""}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold rounded-full shadow-lg shadow-red-500/30">
            🔥 PALING POPULER
          </div>
        </div>
      )}

      <div
        className={`h-full rounded-2xl p-7 md:p-8 border transition-all duration-500 ${plan.popular
          ? "bg-gradient-to-b from-red-500/8 to-transparent border-red-500/20 shadow-xl shadow-red-500/5"
          : "glass-card !transform-none"
          }`}
      >
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
          <p className="text-sm text-white/40">{plan.description}</p>
        </div>

        <div className="mb-8">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-white">{plan.price}</span>
            <span className="text-sm text-white/40">{plan.priceNote}</span>
          </div>
        </div>

        <a
          href={plan.ctaLink}
          className={`block text-center w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 mb-8 ${plan.popular
            ? "bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5"
            : "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5"
            }`}
        >
          {plan.cta}
        </a>

        <div className="space-y-3.5">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-3 text-sm">
              <svg
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? "text-red-400" : "text-white/30"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-white/60">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section id="harga" className="relative py-28 md:py-36">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="absolute top-[30%] left-[10%] w-[600px] h-[600px] bg-[radial-gradient(ellipse,rgba(220,38,38,0.06),transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-red-400 mb-5">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            HARGA
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">
            Harga Transparan,{" "}
            <span className="text-gradient-red">Tanpa Biaya Tersembunyi</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 leading-relaxed">
            Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Upgrade atau downgrade kapan saja.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => (
            <PricingCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>

        {/* Guarantee */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 glass rounded-full px-6 py-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm text-white/60">
              <strong className="text-white">Garansi 30 hari uang kembali</strong> — Tidak puas? Kami kembalikan 100%.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
