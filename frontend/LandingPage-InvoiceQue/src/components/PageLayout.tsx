import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeIcon?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  children: React.ReactNode;
}

export default function PageLayout({
  title,
  subtitle,
  badge,
  badgeIcon,
  breadcrumbs,
  children,
}: PageLayoutProps) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[72px]">
        {/* Page Header */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.08),transparent_70%)]" />
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav aria-label="Breadcrumb" className="mb-6">
                <ol className="flex items-center justify-center gap-2 text-sm text-white/40">
                  <li>
                    <Link href="/" className="hover:text-white/70 transition-colors">
                      Beranda
                    </Link>
                  </li>
                  {breadcrumbs.map((crumb, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {crumb.href ? (
                        <Link href={crumb.href} className="hover:text-white/70 transition-colors">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-white/60">{crumb.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Badge */}
            {badge && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-red-400 mb-5">
                {badgeIcon}
                {badge}
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-base md:text-lg text-white/50 leading-relaxed max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </section>

        {/* Page Content */}
        <section className="relative py-16 md:py-20">
          <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8">
            {children}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
