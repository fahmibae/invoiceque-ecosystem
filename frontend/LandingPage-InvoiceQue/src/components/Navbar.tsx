"use client";

import { useState, useEffect } from "react";

import Link from "next/link";

const navLinks = [
  { label: "Fitur", href: "/#fitur" },
  { label: "Cara Kerja", href: "/#cara-kerja" },
  { label: "Harga", href: "/#harga" },
  { label: "Testimoni", href: "/#testimoni" },
  { label: "FAQ", href: "/#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        id="navbar"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
          ? "bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/20"
          : "bg-transparent"
          }`}
      >
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="InvoiceQu Home">
            <img
              src="/images/invoiceque.svg"
              alt="InvoiceQu Logo"
              width={40}
              height={40}
              className="w-12 h-12 object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight">
                Invoice<span className="text-red-500">Qu</span>
              </span>
              <span className="text-xs font-medium text-gray-400 tracking-tight">Smart Invoice Together</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white rounded-lg transition-all duration-200 hover:bg-white/5"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="https://app.invoicequ.my.id/login"
              className="text-sm font-medium text-white/70 hover:text-white px-4 py-2 transition-colors"
            >
              Masuk
            </a>
            <a
              href="https://app.invoicequ.my.id/register"
              className="btn-primary !py-2.5 !px-6 !text-sm !rounded-lg"
            >
              Mulai Gratis
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden relative z-50 w-10 h-10 flex items-center justify-center"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <div className="w-5 h-4 relative flex flex-col justify-between">
              <span
                className={`block w-full h-[2px] bg-white rounded transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-[7px]" : ""
                  }`}
              />
              <span
                className={`block w-full h-[2px] bg-white rounded transition-all duration-300 ${mobileOpen ? "opacity-0 scale-0" : ""
                  }`}
              />
              <span
                className={`block w-full h-[2px] bg-white rounded transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
                  }`}
              />
            </div>
          </button>
        </nav>
      </header>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-[#09090b]/95 backdrop-blur-2xl transition-all duration-500 ${mobileOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
          }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-2xl font-semibold text-white/80 hover:text-white transition-all"
              style={{
                transitionDelay: mobileOpen ? `${i * 50}ms` : "0ms",
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 mt-6">
            <a
              href="https://app.invoicequ.my.id/login"
              className="btn-secondary !text-base"
              onClick={() => setMobileOpen(false)}
            >
              Masuk
            </a>
            <a
              href="https://app.invoicequ.my.id/register"
              className="btn-primary !text-base"
              onClick={() => setMobileOpen(false)}
            >
              Mulai Gratis
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
