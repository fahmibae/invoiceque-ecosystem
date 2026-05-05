'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { invoiceApi, clientApi, paymentLinkApi, type Invoice, type Client, type PaymentLink } from '@/lib/api';
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils';
import { Search02Icon, GoogleDocIcon, UserGroupIcon, Payment01Icon, ArrowRight01Icon, Cancel01Icon, Loading03Icon } from 'hugeicons-react';
import Portal from '@/components/ui/Portal';

interface SearchResult {
  id: string;
  type: 'invoice' | 'client' | 'payment';
  title: string;
  subtitle: string;
  meta?: string;
  status?: string;
  href: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

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

  // Search logic
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = searchQuery.toLowerCase();

    try {
      const [invoicesRes, clientsRes, paymentsRes] = await Promise.allSettled([
        invoiceApi.list(undefined, 0, 50),
        clientApi.list(undefined, 1, 50),
        paymentLinkApi.list(1, 50),
      ]);

      const allResults: SearchResult[] = [];

      // Filter invoices
      if (invoicesRes.status === 'fulfilled') {
        const invoices = invoicesRes.value.data || [];
        invoices
          .filter(inv =>
            inv.number.toLowerCase().includes(q) ||
            inv.client_name.toLowerCase().includes(q) ||
            (inv.client_email && inv.client_email.toLowerCase().includes(q)) ||
            (inv.notes && inv.notes.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach(inv => {
            allResults.push({
              id: inv.id,
              type: 'invoice',
              title: inv.number,
              subtitle: inv.client_name,
              meta: formatCurrency(inv.total, inv.currency),
              status: inv.status,
              href: `/invoices/${inv.id}`,
            });
          });
      }

      // Filter clients
      if (clientsRes.status === 'fulfilled') {
        const clients = clientsRes.value.data || [];
        clients
          .filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.company && c.company.toLowerCase().includes(q)) ||
            (c.phone && c.phone.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach(c => {
            allResults.push({
              id: c.id,
              type: 'client',
              title: c.name,
              subtitle: c.email,
              meta: c.company || c.city || '',
              href: `/clients/${c.id}`,
            });
          });
      }

      // Filter payment links
      if (paymentsRes.status === 'fulfilled') {
        const payments = paymentsRes.value.data || [];
        payments
          .filter(p =>
            p.title.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
          )
          .slice(0, 5)
          .forEach(p => {
            allResults.push({
              id: p.id,
              type: 'payment',
              title: p.title,
              subtitle: formatCurrency(p.amount, p.currency),
              status: p.status,
              meta: p.description || '',
              href: `/payments/${p.id}`,
            });
          });
      }

      setResults(allResults);
      setActiveIndex(-1);
    } catch {
      setResults([]);
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

  // Keyboard navigation
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <GoogleDocIcon width={16} height={16} />;
      case 'client': return <UserGroupIcon width={16} height={16} />;
      case 'payment': return <Payment01Icon width={16} height={16} />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice': return 'Invoice';
      case 'client': return 'Klien';
      case 'payment': return 'Payment Link';
      default: return '';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'invoice': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/30';
      case 'client': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30';
      case 'payment': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/30';
      default: return '';
    }
  };

  // Group results by type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  // Compute dropdown position from input element
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 420),
        zIndex: 9999,
      });
    }
  }, [isOpen, query]);

  // Count flat index for keyboard nav
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
            placeholder="Cari invoice, klien..."
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
                Mencari...
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                {(['invoice', 'client', 'payment'] as const).map(type => {
                  const items = groupedResults[type];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={type}>
                      {/* Section header */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary/70 border-b border-border-light">
                        <span className={`flex items-center justify-center w-5 h-5 rounded ${getTypeColor(type)}`}>
                          {getTypeIcon(type)}
                        </span>
                        <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">{getTypeLabel(type)}</span>
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
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getTypeColor(item.type)}`}>
                              {getTypeIcon(item.type)}
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
