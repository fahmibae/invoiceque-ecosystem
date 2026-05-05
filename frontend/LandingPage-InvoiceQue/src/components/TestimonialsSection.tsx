"use client";

import { useEffect, useRef, useState } from "react";

const testimonials = [
  {
    name: "Andi Prasetyo",
    role: "CEO, PT. Digital Nusantara",
    avatar: "AP",
    avatarColor: "bg-red-500/20 text-red-400",
    content:
      "InvoiceQu mengubah cara kami mengelola invoice. Dulu butuh waktu berjam-jam untuk buat invoice manual, sekarang tinggal klik dan kirim. Sangat recommended!",
    rating: 5,
  },
  {
    name: "Sarah Wijaya",
    role: "Freelance Designer",
    avatar: "SW",
    avatarColor: "bg-purple-500/20 text-purple-400",
    content:
      "Sebagai freelancer, payment link dari InvoiceQu sangat membantu. Klien bisa langsung bayar tanpa ribet. Invoice juga terlihat sangat profesional.",
    rating: 5,
  },
  {
    name: "Budi Santoso",
    role: "CFO, CV. Maju Bersama",
    avatar: "BS",
    avatarColor: "bg-blue-500/20 text-blue-400",
    content:
      "Dashboard analitiknya luar biasa. Kami bisa melihat status pembayaran real-time dan membuat keputusan bisnis lebih cepat. Tim support juga sangat responsif.",
    rating: 5,
  },
  {
    name: "Diana Putri",
    role: "Owner, Butik Elegance",
    avatar: "DP",
    avatarColor: "bg-emerald-500/20 text-emerald-400",
    content:
      "Awalnya skeptis pakai platform online, tapi InvoiceQu sangat user-friendly. Bahkan staf saya yang tidak terlalu tech-savvy bisa langsung pakai tanpa training.",
    rating: 5,
  },
  {
    name: "Rizki Firmansyah",
    role: "CTO, Startup Fintech",
    avatar: "RF",
    avatarColor: "bg-amber-500/20 text-amber-400",
    content:
      "API-nya sangat well-documented dan mudah di-integrate. Kami berhasil mengotomasi seluruh flow invoicing dalam 2 hari saja. Great developer experience!",
    rating: 5,
  },
  {
    name: "Maya Anggraini",
    role: "Akuntan, Firma AAR",
    avatar: "MA",
    avatarColor: "bg-cyan-500/20 text-cyan-400",
    content:
      "Fitur export laporan sangat memudahkan pekerjaan saya. Data bisa langsung dimasukkan ke software akuntansi tanpa perlu input ulang. Hemat waktu banget!",
    rating: 5,
  },
];

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: (typeof testimonials)[0];
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
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`glass-card rounded-2xl p-7 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      {/* Content */}
      <p className="text-sm text-white/60 leading-relaxed mb-6">
        &ldquo;{testimonial.content}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full ${testimonial.avatarColor} flex items-center justify-center text-sm font-bold`}
        >
          {testimonial.avatar}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{testimonial.name}</div>
          <div className="text-xs text-white/40">{testimonial.role}</div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section id="testimoni" className="relative py-28 md:py-36">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="absolute top-[40%] right-[5%] w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(220,38,38,0.05),transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-red-400 mb-5">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            TESTIMONI
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">
            Apa Kata{" "}
            <span className="text-gradient-red">Pengguna Kami</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 leading-relaxed">
            Ribuan bisnis di Indonesia telah mempercayakan pengelolaan invoice mereka kepada InvoiceQu.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((testimonial, i) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
