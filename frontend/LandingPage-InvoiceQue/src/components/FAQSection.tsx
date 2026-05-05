"use client";

import { useState, useRef, useEffect } from "react";

const faqs = [
  {
    question: "Apa itu InvoiceQu?",
    answer:
      "InvoiceQu adalah platform SaaS modern yang membantu bisnis membuat invoice profesional, mengirim payment link instan, dan melacak pembayaran secara real-time. Semua bisa diakses dari browser tanpa perlu install aplikasi.",
  },
  {
    question: "Apakah ada biaya tersembunyi?",
    answer:
      "Tidak ada. Harga yang tertera sudah termasuk semua fitur yang disebutkan. Tidak ada biaya setup, biaya maintenance, atau biaya tersembunyi lainnya. Paket Starter bahkan gratis selamanya.",
  },
  {
    question: "Payment gateway apa yang didukung?",
    answer:
      "InvoiceQu mendukung berbagai payment gateway populer di Indonesia seperti Xendit, Midtrans, dan lainnya. Klien Anda bisa membayar melalui transfer bank, e-wallet (GoPay, OVO, DANA), kartu kredit, dan QRIS.",
  },
  {
    question: "Apakah data saya aman?",
    answer:
      "Keamanan data adalah prioritas utama kami. InvoiceQu menggunakan enkripsi SSL/TLS, autentikasi multi-faktor, dan data disimpan di server yang comply dengan standar keamanan industri. Kami juga melakukan backup harian secara otomatis.",
  },
  {
    question: "Bisa diakses dari mobile?",
    answer:
      "Ya! InvoiceQu memiliki interface yang fully responsive. Anda bisa membuat invoice, mengirim payment link, dan memantau pembayaran dari smartphone atau tablet tanpa kehilangan fungsionalitas apapun.",
  },
  {
    question: "Bagaimana jika saya butuh fitur khusus?",
    answer:
      "Untuk kebutuhan khusus, Anda bisa memilih paket Enterprise yang menyediakan API access, custom integration, dan dedicated account manager. Hubungi tim sales kami untuk konsultasi gratis.",
  },
  {
    question: "Apakah ada trial gratis?",
    answer:
      "Ya! Paket Starter bisa digunakan gratis selamanya. Untuk paket Professional, kami menyediakan trial 14 hari gratis tanpa perlu kartu kredit. Anda bisa merasakan semua fitur premium sebelum berlangganan.",
  },
];

function FAQItem({
  faq,
  isOpen,
  onToggle,
  index,
}: {
  faq: (typeof faqs)[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div
        className={`glass-card !transform-none rounded-xl overflow-hidden transition-all duration-300 ${isOpen ? "!border-red-500/20 !bg-white/[0.06]" : ""
          }`}
      >
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-5 md:p-6 text-left cursor-pointer"
          aria-expanded={isOpen}
        >
          <span className="text-sm md:text-base font-semibold text-white pr-4">{faq.question}</span>
          <div
            className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isOpen ? "bg-red-500/20 rotate-180" : ""
              }`}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className={`transition-colors ${isOpen ? "text-red-400" : "text-white/40"}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        <div
          ref={contentRef}
          className="overflow-hidden transition-all duration-400"
          style={{
            maxHeight: isOpen ? contentRef.current?.scrollHeight ?? 200 : 0,
          }}
        >
          <div className="px-5 md:px-6 pb-5 md:pb-6 text-sm text-white/50 leading-relaxed border-t border-white/5 pt-4">
            {faq.answer}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-28 md:py-36">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-red-400 mb-5">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            FAQ
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">
            Pertanyaan yang{" "}
            <span className="text-gradient-red">Sering Ditanyakan</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 leading-relaxed">
            Temukan jawaban untuk pertanyaan umum tentang InvoiceQu.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
