'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  invoiceApi, clientApi, paymentLinkApi, quotationApi, taskApi, projectApi,
  chaserApi, timeEntryApi, portalApi,
  type Invoice, type Client, type PaymentLink, type Quotation, type Task, type Project,
  type PaymentChaser, type TimeEntry, type PortalToken,
} from '@/lib/api';
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils';
import {
  Search02Icon, GoogleDocIcon, UserGroupIcon, Payment01Icon,
  ArrowRight01Icon, Cancel01Icon, Loading03Icon,
  SentIcon, Task01Icon, Folder01Icon,
  Home01Icon, ChartIcon, Analytics01Icon, Alert01Icon, Clock01Icon,
  Calendar03Icon, Settings01Icon, Link04Icon, UserGroup03Icon,
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';

// ── Types ──────────────────────────────────────────────

type ResultType = 'invoice' | 'client' | 'payment' | 'quotation' | 'task' | 'project' | 'chaser' | 'timeentry' | 'portal' | 'navigation';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  meta?: string;
  status?: string;
  href: string;
}

// ── Quick-nav pages ────────────────────────────────────

const quickNavPages: SearchResult[] = [
  { id: 'nav-dashboard', type: 'navigation', title: 'Dashboard', subtitle: 'Halaman utama', href: '/' },
  { id: 'nav-invoices', type: 'navigation', title: 'Invoice', subtitle: 'Kelola semua invoice', href: '/invoices' },
  { id: 'nav-invoices-create', type: 'navigation', title: 'Buat Invoice Baru', subtitle: 'Buat invoice baru', href: '/invoices/create' },
  { id: 'nav-invoices-outstanding', type: 'navigation', title: 'Invoice Belum Lunas', subtitle: 'Invoice yang belum dibayar', href: '/invoices/outstanding' },
  { id: 'nav-quotations', type: 'navigation', title: 'Quotation', subtitle: 'Kelola quotation / penawaran', href: '/quotations' },
  { id: 'nav-payments', type: 'navigation', title: 'Payment Links', subtitle: 'Kelola link pembayaran', href: '/payments' },
  { id: 'nav-clients', type: 'navigation', title: 'Daftar Klien', subtitle: 'Kelola data klien', href: '/clients' },
  { id: 'nav-portal', type: 'navigation', title: 'Client Portal', subtitle: 'Portal klien', href: '/portal' },
  { id: 'nav-crm', type: 'navigation', title: 'CRM', subtitle: 'Customer Relationship Management', href: '/crm' },
  { id: 'nav-tasks', type: 'navigation', title: 'Tasks — Kanban Board', subtitle: 'Papan tugas drag & drop', href: '/tasks' },
  { id: 'nav-tasks-list', type: 'navigation', title: 'Tasks — List View', subtitle: 'Daftar tugas dalam bentuk tabel', href: '/tasks/list' },
  { id: 'nav-tasks-dashboard', type: 'navigation', title: 'Tasks — Dashboard', subtitle: 'Ringkasan statistik tugas', href: '/tasks/dashboard' },
  { id: 'nav-projects', type: 'navigation', title: 'Projects', subtitle: 'Kelola proyek', href: '/projects' },
  { id: 'nav-time', type: 'navigation', title: 'Time Tracking', subtitle: 'Lacak waktu kerja & timer', href: '/time-tracking' },
  { id: 'nav-calendar', type: 'navigation', title: 'Kalender', subtitle: 'Kalender jadwal & deadline', href: '/calendar' },
  { id: 'nav-chasers', type: 'navigation', title: 'Payment Chaser', subtitle: 'Pengingat pembayaran otomatis', href: '/chasers' },
  { id: 'nav-health', type: 'navigation', title: 'Health Score', subtitle: 'Skor kesehatan bisnis', href: '/health' },
  { id: 'nav-reports', type: 'navigation', title: 'Laporan', subtitle: 'Laporan & analitik', href: '/reports' },
  { id: 'nav-settings', type: 'navigation', title: 'Pengaturan', subtitle: 'Pengaturan akun & bisnis', href: '/settings' },
  { id: 'nav-notifications', type: 'navigation', title: 'Notifikasi', subtitle: 'Lihat semua notifikasi', href: '/notifications' },
  { id: 'nav-subscription', type: 'navigation', title: 'Subscription', subtitle: 'Kelola langganan', href: '/subscription' },
];

// ── Helpers ────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const TYPE_META: Record<ResultType, { label: string; color: string; icon: React.ReactNode }> = {
  invoice:    { label: 'Invoice',        color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',         icon: <GoogleDocIcon width={16} height={16} /> },
  client:     { label: 'Klien',          color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30', icon: <UserGroupIcon width={16} height={16} /> },
  payment:    { label: 'Payment Link',   color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',       icon: <Payment01Icon width={16} height={16} /> },
  quotation:  { label: 'Quotation',      color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/30',     icon: <SentIcon width={16} height={16} /> },
  task:       { label: 'Task',           color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',     icon: <Task01Icon width={16} height={16} /> },
  project:    { label: 'Project',        color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30',           icon: <Folder01Icon width={16} height={16} /> },
  chaser:     { label: 'Payment Chaser', color: 'text-red-500 bg-red-50 dark:bg-red-900/30',               icon: <Alert01Icon width={16} height={16} /> },
  timeentry:  { label: 'Time Entry',     color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/30',           icon: <Clock01Icon width={16} height={16} /> },
  portal:     { label: 'Client Portal',  color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/30',           icon: <Link04Icon width={16} height={16} /> },
  navigation: { label: 'Navigasi',       color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30',           icon: <ArrowRight01Icon width={16} height={16} /> },
};

const TYPE_ORDER: ResultType[] = ['navigation', 'invoice', 'quotation', 'client', 'task', 'project', 'payment', 'chaser', 'timeentry', 'portal'];

// ── Component ──────────────────────────────────────────

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Search logic ─────────────────────────────────────

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = searchQuery.toLowerCase();

    // Quick-nav filter (instant, no API)
    const navResults: SearchResult[] = quickNavPages
      .filter(p => p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q))
      .slice(0, 5);

    try {
      const [invoicesRes, clientsRes, paymentsRes, quotationsRes, tasksRes, projectsRes, chasersRes, timeRes, portalRes] = await Promise.allSettled([
        invoiceApi.list(undefined, 0, 50),
        clientApi.list(undefined, 1, 50),
        paymentLinkApi.list(1, 50),
        quotationApi.list(undefined, 1, 50),
        taskApi.list({ per_page: 50 }),
        projectApi.list({ per_page: 50 }),
        chaserApi.list(undefined, 1, 50),
        timeEntryApi.list({ per_page: 50 }),
        portalApi.listLinks(),
      ]);

      const allResults: SearchResult[] = [...navResults];

      // Invoices
      if (invoicesRes.status === 'fulfilled') {
        (invoicesRes.value.data || [])
          .filter((inv: Invoice) =>
            inv.number.toLowerCase().includes(q) ||
            inv.client_name.toLowerCase().includes(q) ||
            (inv.client_email && inv.client_email.toLowerCase().includes(q)) ||
            (inv.notes && inv.notes.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach((inv: Invoice) => {
            allResults.push({
              id: inv.id, type: 'invoice', title: inv.number, subtitle: inv.client_name,
              meta: formatCurrency(inv.total, inv.currency), status: inv.status,
              href: `/invoices/${inv.id}`,
            });
          });
      }

      // Clients
      if (clientsRes.status === 'fulfilled') {
        (clientsRes.value.data || [])
          .filter((c: Client) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.company && c.company.toLowerCase().includes(q)) ||
            (c.phone && c.phone.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach((c: Client) => {
            allResults.push({
              id: c.id, type: 'client', title: c.name, subtitle: c.email,
              meta: c.company || c.city || '', href: `/clients/${c.id}`,
            });
          });
      }

      // Payment Links
      if (paymentsRes.status === 'fulfilled') {
        (paymentsRes.value.data || [])
          .filter((p: PaymentLink) =>
            p.title.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach((p: PaymentLink) => {
            allResults.push({
              id: p.id, type: 'payment', title: p.title,
              subtitle: formatCurrency(p.amount, p.currency),
              status: p.status, meta: p.description || '',
              href: `/payments/${p.id}`,
            });
          });
      }

      // Quotations
      if (quotationsRes.status === 'fulfilled') {
        (quotationsRes.value.data || [])
          .filter((qt: Quotation) =>
            qt.quotation_number.toLowerCase().includes(q) ||
            qt.client_name.toLowerCase().includes(q) ||
            (qt.client_email && qt.client_email.toLowerCase().includes(q)) ||
            (qt.notes && qt.notes.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach((qt: Quotation) => {
            allResults.push({
              id: qt.id, type: 'quotation', title: qt.quotation_number, subtitle: qt.client_name,
              meta: formatCurrency(qt.total, qt.currency), status: qt.status,
              href: `/quotations/${qt.id}`,
            });
          });
      }

      // Tasks
      if (tasksRes.status === 'fulfilled') {
        (tasksRes.value.data || [])
          .filter((t: Task) =>
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.client_name && t.client_name.toLowerCase().includes(q)) ||
            (t.project_name && t.project_name.toLowerCase().includes(q)) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
          )
          .slice(0, 5)
          .forEach((t: Task) => {
            allResults.push({
              id: t.id, type: 'task', title: t.title,
              subtitle: [t.project_name, t.client_name].filter(Boolean).join(' · ') || 'No project',
              status: t.status, meta: t.priority,
              href: `/tasks?highlight=${t.id}`,
            });
          });
      }

      // Projects
      if (projectsRes.status === 'fulfilled') {
        (projectsRes.value.data || [])
          .filter((p: Project) =>
            p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            (p.client_name && p.client_name.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach((p: Project) => {
            allResults.push({
              id: p.id, type: 'project', title: p.name,
              subtitle: p.client_name || 'No client',
              status: p.status,
              meta: p.budget ? formatCurrency(p.budget, p.currency) : '',
              href: `/projects/${p.id}`,
            });
          });
      }

      // Payment Chasers
      if (chasersRes.status === 'fulfilled') {
        (chasersRes.value.data || [])
          .filter((ch: PaymentChaser) =>
            ch.invoice_number.toLowerCase().includes(q) ||
            ch.client_name.toLowerCase().includes(q) ||
            (ch.client_email && ch.client_email.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach((ch: PaymentChaser) => {
            allResults.push({
              id: ch.id, type: 'chaser', title: ch.invoice_number,
              subtitle: ch.client_name,
              meta: formatCurrency(ch.amount_due, ch.currency),
              status: ch.status,
              href: '/chasers',
            });
          });
      }

      // Time Entries
      if (timeRes.status === 'fulfilled') {
        (timeRes.value.data || [])
          .filter((te: TimeEntry) =>
            te.task_title.toLowerCase().includes(q) ||
            (te.project_name && te.project_name.toLowerCase().includes(q)) ||
            (te.notes && te.notes.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach((te: TimeEntry) => {
            const hrs = Math.floor(te.duration_seconds / 3600);
            const mins = Math.floor((te.duration_seconds % 3600) / 60);
            allResults.push({
              id: te.id, type: 'timeentry', title: te.task_title,
              subtitle: te.project_name || te.date,
              meta: `${hrs}j ${mins}m`,
              href: '/time-tracking',
            });
          });
      }

      // Portal Tokens
      if (portalRes.status === 'fulfilled') {
        (portalRes.value.data || [])
          .filter((pt: PortalToken) =>
            pt.client_name.toLowerCase().includes(q) ||
            pt.client_email.toLowerCase().includes(q)
          )
          .slice(0, 5)
          .forEach((pt: PortalToken) => {
            allResults.push({
              id: pt.id, type: 'portal', title: pt.client_name,
              subtitle: pt.client_email,
              status: pt.is_active ? 'active' : 'inactive',
              href: '/portal',
            });
          });
      }

      setResults(allResults);
      setActiveIndex(-1);
    } catch {
      // On error, still show nav results
      setResults(navResults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [debouncedQuery, performSearch]);

  // ── Keyboard navigation ──────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      navigateTo(results[activeIndex]);
    }
  };

  const navigateTo = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    router.push(result.href);
  };

  // ── Group results by type ────────────────────────────

  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  // ── Dropdown positioning ─────────────────────────────

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 480),
        zIndex: 9999,
      });
    }
  }, [isOpen, query]);

  // Flat index counter for keyboard nav
  let flatIndex = -1;

  return (
    <>
      <div ref={containerRef} className="relative flex items-center w-full max-w-[400px] max-lg:hidden">
        <div className="relative w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none flex items-center justify-center">
            <Search02Icon className='dark:text-white text-black' width={18} height={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari invoice, klien, task, project..."
            className="w-full py-2.5 pr-16 pl-10 border border-border-color rounded-full bg-bg-secondary text-text-primary text-[13px] transition-all duration-150 outline-none focus:border-red-400 focus:bg-bg-card focus:ring-3 focus:ring-red-500/10 placeholder:text-text-tertiary"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) {
                setIsOpen(true);
                setLoading(true);
              } else {
                setIsOpen(false);
              }
            }}
            onFocus={() => {
              if (query) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
          />
          {/* Shortcut badge or clear button */}
          {query ? (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
            >
              <Cancel01Icon width={14} height={14} />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-text-tertiary bg-bg-primary border border-border-color rounded px-1.5 py-0.5 pointer-events-none select-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown via Portal */}
      {isOpen && (
        <Portal>
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-bg-card border border-border-color rounded-xl shadow-2xl overflow-hidden animate-fade-in"
          >
            {loading && !results.length ? (
              <div className="flex items-center justify-center gap-2 py-8 text-text-secondary text-sm">
                <Loading03Icon width={18} height={18} className="animate-spin" />
                Mencari di semua data...
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-[420px] overflow-y-auto">
                {TYPE_ORDER.map(type => {
                  const items = groupedResults[type];
                  if (!items || items.length === 0) return null;
                  const meta = TYPE_META[type];
                  return (
                    <div key={type}>
                      {/* Section header */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary/70 border-b border-border-light sticky top-0 z-10">
                        <span className={`flex items-center justify-center w-5 h-5 rounded ${meta.color}`}>
                          {meta.icon}
                        </span>
                        <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">{meta.label}</span>
                        <span className="text-[10px] text-text-tertiary bg-bg-secondary border border-border-color rounded-full px-1.5 py-0 font-semibold">{items.length}</span>
                      </div>
                      {/* Items */}
                      {items.map((item) => {
                        flatIndex++;
                        const idx = flatIndex;
                        return (
                          <button
                            key={item.id}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-100 border-b border-border-light/50 last:border-b-0 group ${
                              activeIndex === idx
                                ? 'bg-red-50 dark:bg-red-900/20'
                                : 'hover:bg-bg-hover'
                            }`}
                            onClick={() => navigateTo(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TYPE_META[item.type].color}`}>
                              {TYPE_META[item.type].icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-primary truncate">{item.title}</span>
                                {item.status && (
                                  <span className={`badge text-[10px] py-0 px-1.5 ${getStatusColor(item.status)}`}>
                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-text-tertiary truncate">{item.subtitle}</div>
                            </div>
                            {item.meta && (
                              <span className="text-xs font-semibold text-text-secondary shrink-0">{item.meta}</span>
                            )}
                            <ArrowRight01Icon width={14} height={14} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : query.trim() ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Search02Icon width={32} height={32} className="text-text-tertiary opacity-40" />
                <p className="text-sm text-text-secondary">Tidak ada hasil untuk <strong>&quot;{query}&quot;</strong></p>
                <p className="text-xs text-text-tertiary">Coba kata kunci lain</p>
              </div>
            ) : null}

            {/* Footer hint */}
            {results.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary/50 border-t border-border-light text-[11px] text-text-tertiary">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><kbd className="bg-bg-primary border border-border-color rounded px-1 py-0 text-[10px]">↑↓</kbd> navigasi</span>
                  <span className="flex items-center gap-1"><kbd className="bg-bg-primary border border-border-color rounded px-1 py-0 text-[10px]">↵</kbd> buka</span>
                  <span className="flex items-center gap-1"><kbd className="bg-bg-primary border border-border-color rounded px-1 py-0 text-[10px]">Esc</kbd> tutup</span>
                </div>
                <span>{results.length} hasil</span>
              </div>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}
