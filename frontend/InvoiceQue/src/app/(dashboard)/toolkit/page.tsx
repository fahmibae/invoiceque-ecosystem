'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench01Icon, CheckListIcon,
  PaintBoardIcon, GoogleDocIcon, ArrowRight01Icon, Loading03Icon,
  FlashIcon, MoneyReceiveSquareIcon, StickyNote02Icon,
  LegalDocument01Icon, StarIcon,
} from 'hugeicons-react';
import { toolkitApi, expenseApi, type ExpenseStats } from '@/lib/api';

// ── Universal Tools (semua freelancer butuh) ──────────────────

const UNIVERSAL_TOOLS = [
  {
    href: '/toolkit/expenses',
    label: 'Expense Tracker',
    desc: 'Catat & kategorisasi semua pengeluaran bisnis',
    icon: MoneyReceiveSquareIcon,
    color: '#10B981',
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    statKey: 'expenses',
    isNew: true,
  },
  {
    href: '/toolkit/contracts',
    label: 'Contract Templates',
    desc: 'Template kontrak, NDA, & scope of work',
    icon: LegalDocument01Icon,
    color: '#6366F1',
    gradient: 'from-indigo-500 to-purple-600',
    bgLight: 'bg-indigo-50 dark:bg-indigo-900/20',
    statKey: 'contract_template',
    isNew: true,
  },
  {
    href: '/toolkit/notes',
    label: 'Quick Notes',
    desc: 'Catatan cepat, ide, meeting notes',
    icon: StickyNote02Icon,
    color: '#F59E0B',
    gradient: 'from-amber-400 to-orange-500',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    statKey: 'note',
    isNew: true,
  },
  {
    href: '/toolkit/checklists',
    label: 'Checklists',
    desc: 'Template proses kerja yang bisa di-reuse',
    icon: CheckListIcon,
    color: '#EF4444',
    gradient: 'from-red-500 to-rose-600',
    bgLight: 'bg-red-50 dark:bg-red-900/20',
    statKey: 'checklist',
  },
];

// ── Profession-Specific Tools ─────────────────────────────────

const PROFESSION_PACKS = [
  {
    id: 'designer',
    title: '🎨 Designer Tools',
    description: 'Color palettes, brand kits, mood boards.',
    color: '#8B5CF6',
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50 dark:bg-violet-900/20',
    icon: PaintBoardIcon,
    tools: [
      { href: '/toolkit/palettes', label: 'Color Palettes', desc: 'Simpan palette warna per project', statKey: 'palette' },
      { href: '/toolkit/brand-kits', label: 'Brand Kits', desc: 'Logo, font, warna per klien', statKey: 'brand_kit' },
    ],
  },
  {
    id: 'writer',
    title: '✍️ Writer Tools',
    description: 'Content briefs, editorial notes, style guides.',
    color: '#F59E0B',
    gradient: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    icon: GoogleDocIcon,
    tools: [
      { href: '/toolkit/briefs', label: 'Content Briefs', desc: 'Template brief yang bisa di-share', statKey: 'brief' },
    ],
  },
  {
    id: 'marketing',
    title: '📈 Marketing Tools',
    description: 'Campaign tracker, analytics, content scheduler.',
    color: '#10B981',
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: FlashIcon,
    tools: [
      { href: '/toolkit/campaigns', label: 'Campaign Tracker', desc: 'Track campaign per klien', statKey: 'campaign' },
    ],
  },
];

export default function ToolkitHubPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      toolkitApi.stats().then(setStats).catch(() => {}),
      expenseApi.stats().then(setExpenseStats).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const totalToolkitItems = stats.total || 0;
  const totalExpenses = expenseStats?.total_count || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon width={32} height={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <Wrench01Icon width={22} height={22} />
            </span>
            Freelancer Toolkit
          </h1>
          <p className="page-subtitle">
            {totalToolkitItems + totalExpenses} item tersimpan · Workspace lengkap untuk menjalankan bisnis freelance
          </p>
        </div>
      </div>

      {/* ═══ BUSINESS ESSENTIALS ═══ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <StarIcon width={16} height={16} className="text-amber-500" />
          <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Business Essentials</h2>
          <span className="text-[10px] text-text-tertiary">— Semua freelancer butuh ini</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {UNIVERSAL_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const count = tool.statKey === 'expenses'
              ? totalExpenses
              : (stats[tool.statKey] || 0);

            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="card group p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
              >
                {/* Gradient accent bar */}
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tool.gradient}`} />

                {tool.isNew && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                    NEW
                  </span>
                )}

                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}
                  style={{ boxShadow: `0 8px 24px ${tool.color}25` }}
                >
                  <Icon width={24} height={24} />
                </div>

                <h3 className="font-bold text-sm text-text-primary mb-1">{tool.label}</h3>
                <p className="text-xs text-text-tertiary mb-3 line-clamp-2">{tool.desc}</p>

                <div className="flex items-center justify-between">
                  {count > 0 ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tool.color}15`, color: tool.color }}>
                      {count} item
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">Mulai →</span>
                  )}
                  <ArrowRight01Icon width={14} height={14} className="text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Expense Summary Banner (if has data) */}
      {expenseStats && expenseStats.total_amount > 0 && (
        <Link href="/toolkit/expenses" className="block mb-8">
          <div className="card p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                  <MoneyReceiveSquareIcon width={20} height={20} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Total Pengeluaran Bisnis</div>
                  <div className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300">
                    Rp {expenseStats.total_amount.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Bulan Ini</div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    Rp {expenseStats.this_month.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Tax Deductible</div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    Rp {expenseStats.tax_deductible_total.toLocaleString('id-ID')}
                  </div>
                </div>
                <ArrowRight01Icon width={18} height={18} className="text-emerald-500" />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ═══ PROFESSION PACKS ═══ */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Wrench01Icon width={16} height={16} className="text-text-tertiary" />
          <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Profession Tools</h2>
          <span className="text-[10px] text-text-tertiary">— Spesifik untuk keahlian kamu</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {PROFESSION_PACKS.map((pack) => {
            const Icon = pack.icon;
            const packCount = pack.tools.reduce((sum, t) => sum + (stats[t.statKey] || 0), 0);

            return (
              <div key={pack.id} className="card overflow-hidden">
                {/* Pack Header */}
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border-light">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pack.gradient} flex items-center justify-center text-white shadow-lg`}
                    style={{ boxShadow: `0 6px 20px ${pack.color}25` }}
                  >
                    <Icon width={20} height={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-text-primary">{pack.title}</h3>
                    <p className="text-xs text-text-tertiary">{pack.description}</p>
                  </div>
                  {packCount > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${pack.color}15`, color: pack.color }}>
                      {packCount}
                    </span>
                  )}
                </div>

                {/* Tools */}
                <div className="flex flex-col gap-2">
                  {pack.tools.map((tool) => {
                    const count = stats[tool.statKey] || 0;
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="group flex items-center gap-3 p-3 rounded-xl border border-border-light hover:border-current hover:shadow-md transition-all duration-200"
                      >
                        <div className={`w-8 h-8 rounded-lg ${pack.bgLight} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon width={16} height={16} style={{ color: pack.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text-primary">{tool.label}</span>
                            {count > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-tertiary">{count}</span>
                            )}
                          </div>
                          <span className="text-xs text-text-tertiary">{tool.desc}</span>
                        </div>
                        <ArrowRight01Icon width={14} height={14} className="text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
