import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Komunitas",
  description: "Bergabung dengan komunitas InvoiceQu. Diskusi, berbagi tips, dan terhubung dengan pengguna lain.",
  alternates: { canonical: "https://invoicequ.my.id/komunitas" },
};

const channels = [
  { name: "Forum Diskusi", desc: "Tanya jawab dan diskusi seputar penggunaan InvoiceQu.", icon: "💬", members: "1,200+", link: "#" },
  { name: "Grup Telegram", desc: "Bergabung dengan grup Telegram untuk update dan networking.", icon: "📱", members: "850+", link: "#" },
  { name: "Discord Server", desc: "Channel untuk developer, feedback, dan diskusi teknis.", icon: "🎮", members: "600+", link: "#" },
  { name: "Facebook Group", desc: "Komunitas bisnis Indonesia pengguna InvoiceQu.", icon: "👥", members: "2,100+", link: "#" },
];

const events = [
  { title: "InvoiceQu Meetup Jakarta", date: "15 Mei 2026", type: "Offline", desc: "Networking dan sharing session bersama pengguna InvoiceQu di Jakarta." },
  { title: "Webinar: Tips Kelola Cash Flow", date: "25 Mei 2026", type: "Online", desc: "Belajar strategi cash flow management dari praktisi bisnis." },
  { title: "Workshop: Integrasi API", date: "5 Jun 2026", type: "Online", desc: "Hands-on workshop integrasi API InvoiceQu untuk developer." },
];

export default function KomunitasPage() {
  return (
    <PageLayout title="Komunitas InvoiceQu" subtitle="Terhubung dengan ribuan pengguna InvoiceQu di seluruh Indonesia." badge="KOMUNITAS" breadcrumbs={[{ label: "Komunitas" }]}>
      {/* Channels */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-white mb-6">Bergabung dengan Kami</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {channels.map((ch) => (
            <a key={ch.name} href={ch.link} className="glass-card rounded-xl p-6 group block">
              <div className="text-3xl mb-3">{ch.icon}</div>
              <h3 className="text-base font-bold text-white mb-1 group-hover:text-red-400 transition-colors">{ch.name}</h3>
              <p className="text-sm text-white/45 mb-3">{ch.desc}</p>
              <span className="text-xs text-red-400 font-semibold">{ch.members} anggota</span>
            </a>
          ))}
        </div>
      </div>

      {/* Events */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Event Mendatang</h2>
        <div className="space-y-4">
          {events.map((ev) => (
            <div key={ev.title} className="glass-card !transform-none rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold text-white">{ev.title}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-xs font-semibold">{ev.type}</span>
                </div>
                <p className="text-xs text-white/40 mb-1">{ev.date}</p>
                <p className="text-sm text-white/50">{ev.desc}</p>
              </div>
              <button className="btn-secondary !py-2 !px-4 !text-sm shrink-0">Daftar</button>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
