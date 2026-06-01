"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { getCountryCallingCode } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";

/* react-phone-number-input passes options as { value, label, divider } objects */
interface CountryOption {
  value?: Country;
  label: string;
  divider?: boolean;
}

interface CustomCountrySelectProps {
  value?: Country;
  onChange: (country: Country) => void;
  options: CountryOption[];
  iconComponent?: React.ComponentType<{ country: Country; label: string }>;
  disabled?: boolean;
  name?: string;
  "aria-label"?: string;
  [key: string]: unknown;
}

export default function CustomCountrySelect({
  value,
  onChange,
  options,
  iconComponent: IconComponent,
}: CustomCountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected into view
  useEffect(() => {
    if (isOpen && listRef.current && value) {
      const el = listRef.current.querySelector(`[data-country="${value}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, value]);

  const handleSelect = useCallback(
    (country: Country) => {
      onChange(country);
      setIsOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    },
    [],
  );

  // Filter options — skip dividers and "International" (no value)
  const countryOptions = options.filter(
    (opt): opt is CountryOption & { value: Country } =>
      !!opt.value && !opt.divider,
  );

  const filtered = countryOptions.filter((opt) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (opt.label || "").toLowerCase();
    const code = (opt.value || "").toLowerCase();
    let callingCode = "";
    try {
      callingCode = `+${getCountryCallingCode(opt.value)}`;
    } catch {
      // skip
    }
    return name.includes(q) || code.includes(q) || callingCode.includes(q);
  });

  // Get calling code safely
  const getCode = (country: Country): string => {
    try {
      return `+${getCountryCallingCode(country)}`;
    } catch {
      return "";
    }
  };

  // Find current label
  const currentLabel =
    countryOptions.find((opt) => opt.value === value)?.label || "";

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1.5 transition-all duration-200 hover:border-red-400/40 hover:bg-red-500/[0.04] hover:shadow-[0_1px_3px_rgba(220,38,38,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={currentLabel}
      >
        {value && IconComponent && (
          <span className="w-[22px] h-[16px] rounded-[3px] overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.08)] shrink-0">
            <IconComponent country={value} label={currentLabel} />
          </span>
        )}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`text-[var(--text-tertiary)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[280px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2.5 border-b border-[var(--border-color)]">
            <div className="relative">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 pl-8 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-red-400/50 focus:ring-2 focus:ring-red-500/10 transition-all"
              />
            </div>
          </div>

          {/* Country list */}
          <div
            ref={listRef}
            className="max-h-[240px] overflow-y-auto overscroll-contain"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--text-tertiary)]">
                No countries found
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                const callingCode = getCode(opt.value);

                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-country={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 cursor-pointer ${
                      isSelected
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {IconComponent && (
                      <span className="w-[22px] h-[16px] rounded-[3px] overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.08)] shrink-0">
                        <IconComponent
                          country={opt.value}
                          label={opt.label}
                        />
                      </span>
                    )}
                    <span className="flex-1 text-[13px] font-medium truncate">
                      {opt.label}
                    </span>
                    <span className="text-[12px] font-mono text-[var(--text-tertiary)] tabular-nums shrink-0">
                      {callingCode}
                    </span>
                    {isSelected && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-red-600 shrink-0"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
