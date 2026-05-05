"use client";

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-120"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.12),transparent_70%)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Floating orbs */}
        <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-red-600/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[20%] right-[5%] w-96 h-96 bg-red-500/8 rounded-full blur-[150px] animate-float-slow" />
        <div className="absolute top-[40%] right-[20%] w-48 h-48 bg-orange-500/6 rounded-full blur-[100px] animate-float" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="animate-fade-in-down inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-white/80">Platform Invoice #1 di Indonesia</span>
        </div>

        {/* Main Title */}
        <h1
          className="hero-title text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight mb-6 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          Kelola Invoice &<br />
          Payment Link dengan{" "}
          <span className="text-gradient-red">Mudah</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
          style={{ animationDelay: "0.25s" }}
        >
          Platform SaaS modern untuk membuat invoice profesional, mengirim
          payment link instan, dan melacak pembayaran secara real-time.
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <a
            href="https://app.invoicequ.my.id/register"
            id="hero-cta-primary"
            className="btn-primary text-base animate-pulse-glow"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Mulai Gratis Sekarang
          </a>
          <a href="/demo" id="hero-cta-secondary" className="btn-secondary text-base">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lihat Demo
          </a>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto animate-fade-in-up"
          style={{ animationDelay: "0.55s" }}
        >
          {[
            { value: "10K+", label: "Invoice Terkirim" },
            { value: "2.5K+", label: "Pengguna Aktif" },
            { value: "99.9%", label: "Uptime" },
            { value: "4.8★", label: "Rating Pengguna" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-gradient-red mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard Preview */}
        <div
          className="mt-20 relative animate-fade-in-up"
          style={{ animationDelay: "0.7s" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent z-10 pointer-events-none rounded-xl" />
          <div className="relative glass rounded-2xl p-1 max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden bg-[#111113] border border-white/5">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1 bg-white/5 rounded-md text-xs text-white/40">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    app.invoicequ.my.id/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard Content */}
              <div className="p-6 md:p-8">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-lg font-bold text-white mb-1">Dashboard Overview</div>
                    <div className="text-sm text-white/40">Selamat datang kembali, Fahmi 👋</div>
                  </div>
                  <div className="hidden md:flex items-center gap-3">
                    <div className="px-4 py-2 bg-red-600/20 text-red-400 text-xs font-semibold rounded-lg border border-red-600/30">
                      + Buat Invoice
                    </div>
                  </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { title: "Total Invoice", value: "Rp 45.2M", change: "+12.5%", color: "text-emerald-400" },
                    { title: "Belum Dibayar", value: "Rp 8.7M", change: "3 invoice", color: "text-amber-400" },
                    { title: "Payment Links", value: "24 aktif", change: "+5 baru", color: "text-blue-400" },
                    { title: "Klien", value: "156", change: "+8 bulan ini", color: "text-purple-400" },
                  ].map((card) => (
                    <div
                      key={card.title}
                      className="p-4 rounded-xl bg-white/3 border border-white/5"
                    >
                      <div className="text-xs text-white/40 mb-2">{card.title}</div>
                      <div className="text-lg font-bold text-white">{card.value}</div>
                      <div className={`text-xs mt-1 ${card.color}`}>{card.change}</div>
                    </div>
                  ))}
                </div>

                {/* Table Preview */}
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="text-sm font-semibold text-white/80">Invoice Terbaru</div>
                    <div className="text-xs text-red-400 cursor-pointer">Lihat Semua →</div>
                  </div>
                  {[
                    { id: "INV-001", client: "PT. Maju Jaya", amount: "Rp 5.200.000", status: "Lunas", statusColor: "bg-emerald-500/20 text-emerald-400" },
                    { id: "INV-002", client: "CV. Teknologi", amount: "Rp 3.800.000", status: "Pending", statusColor: "bg-amber-500/20 text-amber-400" },
                    { id: "INV-003", client: "UD. Berkah", amount: "Rp 1.500.000", status: "Lunas", statusColor: "bg-emerald-500/20 text-emerald-400" },
                  ].map((row) => (
                    <div
                      key={row.id}
                      className="px-4 py-3 border-b border-white/3 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-white/50 font-mono text-xs">{row.id}</span>
                        <span className="text-white/80">{row.client}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-white/70 font-medium hidden sm:block">{row.amount}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${row.statusColor}`}>
                          {row.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted By */}
        <div
          className="mt-16 animate-fade-in-up"
          style={{ animationDelay: "0.85s" }}
        >
          <p className="text-sm text-white/30 mb-6">Dipercaya oleh bisnis dari berbagai industri</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-30">
            {["Startup Tech", "Agensi Kreatif", "Firma Hukum", "Konsultan IT", "Studio Desain"].map(
              (name) => (
                <div key={name} className="text-sm font-semibold tracking-wider uppercase text-white/60">
                  {name}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090b] to-transparent pointer-events-none" />
    </section>
  );
}
