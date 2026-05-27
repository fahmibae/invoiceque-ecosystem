'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ALL_CURRENCIES, POPULAR_CURRENCIES, getCurrencyInfo, type CurrencyInfo } from '@/lib/currencies';

interface CurrencySelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  /** When provided, only currencies in this set will be shown */
  allowedCurrencies?: Set<string>;
}

export default function CurrencySelect({ value, onChange, className, allowedCurrencies }: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = getCurrencyInfo(value);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    // If allowedCurrencies is provided, filter all lists to only allowed ones
    const available = allowedCurrencies
      ? ALL_CURRENCIES.filter(c => allowedCurrencies.has(c.code))
      : ALL_CURRENCIES;
    if (!q) {
      // Show popular first, then the rest
      const popularSet = new Set(POPULAR_CURRENCIES);
      const popular = POPULAR_CURRENCIES
        .map(code => available.find(c => c.code === code))
        .filter(Boolean) as CurrencyInfo[];
      const rest = available.filter(c => !popularSet.has(c.code));
      return { popular, rest };
    }
    const matches = available.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
    return { popular: [] as CurrencyInfo[], rest: matches };
  }, [search, allowedCurrencies]);

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  };

  const renderItem = (c: CurrencyInfo) => (
    <button
      key={c.code}
      type="button"
      onClick={() => handleSelect(c.code)}
      className={`currency-select-item ${value === c.code ? 'currency-select-item--active' : ''}`}
    >
      <span className="currency-select-flag">{c.flag}</span>
      <span className="currency-select-code">{c.code}</span>
      <span className="currency-select-name">{c.name}</span>
      <span className="currency-select-symbol">{c.symbol}</span>
    </button>
  );

  return (
    <div ref={containerRef} className={`currency-select ${className || ''}`} onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="currency-select-trigger"
      >
        <span className="currency-select-flag">{selected.flag}</span>
        <span className="currency-select-code">{selected.code}</span>
        <span className="currency-select-name hide-mobile">{selected.name}</span>
        <svg className="currency-select-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="currency-select-dropdown">
          {/* Search */}
          <div className="currency-select-search-wrap">
            <svg className="currency-select-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="currency-select-search"
              placeholder="Cari mata uang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="currency-select-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* List */}
          <div ref={listRef} className="currency-select-list">
            {filtered.popular.length > 0 && (
              <>
                <div className="currency-select-section">Populer</div>
                {filtered.popular.map(renderItem)}
                <div className="currency-select-divider" />
                <div className="currency-select-section">Semua Mata Uang</div>
              </>
            )}
            {filtered.rest.length > 0 ? (
              filtered.rest.map(renderItem)
            ) : (
              filtered.popular.length === 0 && (
                <div className="currency-select-empty">Tidak ditemukan</div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
