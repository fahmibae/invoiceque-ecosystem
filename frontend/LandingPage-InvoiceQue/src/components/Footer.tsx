
import Link from "next/link";
import {ThreadsIcon, InstagramIcon,Linkedin02Icon, NewTwitterIcon} from 'hugeicons-react';

const footerLinks = {
  Produk: [
    { label: "Fitur", href: "/#fitur" },
    { label: "Harga", href: "/#harga" },
    { label: "API Docs", href: "/api-docs" },
    { label: "Integrasi", href: "/integrasi" },
    { label: "Changelog", href: "/changelog" },
  ],
  Perusahaan: [
    { label: "Tentang Kami", href: "/tentang" },
    { label: "Blog", href: "/blog" },
    { label: "Kontak", href: "/#kontak" },
    { label: "Partner", href: "/partner" },
  ],
  Bantuan: [
    { label: "Pusat Bantuan", href: "/bantuan" },
    { label: "Dokumentasi", href: "/dokumentasi" },
    { label: "Status Sistem", href: "/status" },
    { label: "Komunitas", href: "/komunitas" },
  ],
  Legal: [
    { label: "Kebijakan Privasi", href: "/privasi" },
    { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
    { label: "Keamanan", href: "/keamanan" },
  ],
};

export default function Footer() {
  return (
    <footer id="kontak" className="relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-8">
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <img
                src="/images/invoiceque.svg"
                alt="InvoiceQu Logo"
                width={40}
                height={40}
                className="w-12 h-12 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight">
                  Invoice<span className="text-red-500">Qu</span>
                </span>
                <span className="text-xs font-medium text-gray-400 tracking-tight">Smart Invoice Together</span>
              </div>
            </Link>
            <p className="text-sm text-white/40 leading-relaxed mb-6 max-w-xs">
              Platform SaaS modern untuk membuat invoice profesional, mengirim
              payment link, dan melacak pembayaran secara real-time.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {[
                {
                  label: "Threads",
                  href: "https://www.threads.com/@invoicequ_",
                  icon: (
                    <ThreadsIcon height={18} width={18} />
                  ),
                },
                {
                  label: "X",
                  href: "https://x.com/InvoiceQu",
                  icon: (
                    <NewTwitterIcon height={18} width={18} />
                  ),
                },
                {
                  label: "Instagram",
                  href: "https://www.instagram.com/invoicequ_?igsh=eXpsN2puMDZ0MXdt",
                  icon: (
                    <InstagramIcon height={18} width={18} />
                  ),
                },
                {
                  label: "LinkedIn",
                  href: "https://www.linkedin.com/in/invoicequ-app-259090413?utm_source=share_via&utm_content=profile&utm_medium=member_android",
                  icon: (
                   <Linkedin02Icon height={18} width={18} />
                  ),
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} InvoiceQu. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <a href="/privasi" className="hover:text-white/60 transition-colors">
              Kebijakan Privasi
            </a>
            <a href="/syarat-ketentuan" className="hover:text-white/60 transition-colors">
              Syarat &amp; Ketentuan
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
