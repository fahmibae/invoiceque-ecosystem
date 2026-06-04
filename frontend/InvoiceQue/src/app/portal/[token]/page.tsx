"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { portalApi, type PortalDashboard, type ToolkitItem } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Globe02Icon,
  GoogleDocIcon,
  Home01Icon,
  LegalDocument01Icon,
  LockedIcon,
  Search02Icon,
  SentIcon,
  ValidationApprovalIcon,
} from "hugeicons-react";
import {
  appLocales,
  defaultAppLocale,
  detectAppLocale,
  isAppLocale,
  translate,
  type AppLocale,
  type TranslationKey,
} from "@/lib/app-i18n";
import {
  ContractPaperPreview,
  ContractPaperSizePicker,
  ContractPrintStyle,
  type ContractPaperSize,
} from "@/components/contracts/ContractPaperPreview";

const statusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  partially_paid: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  converted: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const statusLabels: Record<string, string> = {
  paid: "Paid",
  sent: "Sent",
  overdue: "Overdue",
  partially_paid: "Partially Paid",
  draft: "Draft",
  accepted: "Accepted",
  rejected: "Rejected",
  converted: "Converted",
};

// Inline SVG Icons to avoid import issues
const PrinterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" {...props}>
    <path d="M6 6V3C6 2.44772 6.44772 1.5 7 1.5H17C17.5523 1.5 18 2.44772 18 3V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 9.5C3 7.84315 4.34315 6.5 6 6.5H18C19.6569 6.5 21 7.84315 21 9.5V14.5C21 16.1569 19.6569 17.5 18 17.5H6C4.34315 17.5 3 16.1569 3 14.5V9.5Z" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="18" cy="9.5" r="1" fill="currentColor" />
    <path d="M6 14.5H18V21.5H6V14.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" {...props}>
    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type PortalTranslateFn = (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => string;

function PortalLanguageSwitcher({
  locale,
  onChange,
  t,
  align = "right",
  variant = "default",
  menuMode = "absolute",
  placement = "bottom",
}: {
  locale: AppLocale;
  onChange: (locale: AppLocale) => void;
  t: PortalTranslateFn;
  align?: "left" | "right";
  variant?: "default" | "sidebar";
  menuMode?: "absolute" | "fixed";
  placement?: "bottom" | "top";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const currentLocale =
    appLocales.find((item) => item.code === locale) || appLocales[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-bold transition-all duration-150 ${
          variant === "sidebar"
            ? "border-white/15 bg-white/10 text-white hover:border-white/30 hover:bg-white/15"
            : "border-border-color bg-bg-secondary text-text-primary hover:border-red-300 hover:bg-bg-hover"
        }`}
        aria-label={t("language.switcherLabel")}
        title={t("language.switcherLabel")}
      >
        <Globe02Icon width={18} height={18} />
        <span className="text-[11px] leading-none">
          {currentLocale.shortLabel}
        </span>
      </button>

      {isOpen && (
        <div
          className={`${menuMode === "fixed" ? "fixed right-4 top-[68px]" : `absolute ${placement === "top" ? "bottom-full mb-2" : "top-full mt-2"} ${align === "left" ? "left-0" : "right-0"}`} z-[260] w-44 overflow-hidden rounded-lg border shadow-lg ${
            variant === "sidebar"
              ? "border-white/15 bg-red-950/95 text-white shadow-black/20"
              : "border-border-color bg-bg-secondary"
          }`}
        >
          <div className={`border-b px-3 py-2 text-[11px] font-bold uppercase tracking-[0.6px] ${
            variant === "sidebar"
              ? "border-white/10 text-white/50"
              : "border-border-color text-text-tertiary"
          }`}>
            {t("language.chooseLanguage")}
          </div>
          {appLocales.map((item) => {
            const active = item.code === locale;

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  onChange(item.code);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  variant === "sidebar"
                    ? active
                      ? "bg-white/20 font-semibold text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                    : active
                      ? "bg-red-50 font-semibold text-red-600 dark:bg-red-900/20"
                      : "text-text-primary hover:bg-bg-hover hover:text-red-500"
                }`}
                aria-current={active ? "true" : undefined}
              >
                <span>{t(`language.${item.code}` as TranslationKey)}</span>
                {active && <CheckmarkCircle02Icon width={16} height={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatPortalDate(date: string, locale: string = "en"): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : locale === "ms" ? "ms-MY" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

const getStringValue = (value: unknown) => (typeof value === "string" ? value : undefined);

type PortalSection = "dashboard" | "invoices" | "quotations" | "contracts";

const ITEMS_PER_PAGE = 10;

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  ae: "AED",
  argentina: "ARS",
  ar: "ARS",
  australia: "AUD",
  au: "AUD",
  austria: "EUR",
  bahrain: "BHD",
  bh: "BHD",
  belgium: "EUR",
  brazil: "BRL",
  br: "BRL",
  brunei: "BND",
  bn: "BND",
  cambodia: "KHR",
  ca: "CAD",
  canada: "CAD",
  chile: "CLP",
  cl: "CLP",
  china: "CNY",
  cn: "CNY",
  colombia: "COP",
  co: "COP",
  croatia: "EUR",
  cyprus: "EUR",
  czechia: "CZK",
  denmark: "DKK",
  dk: "DKK",
  egypt: "EGP",
  ee: "EUR",
  england: "GBP",
  estonia: "EUR",
  eu: "EUR",
  finland: "EUR",
  france: "EUR",
  germany: "EUR",
  greece: "EUR",
  hongkong: "HKD",
  "hong kong": "HKD",
  hk: "HKD",
  id: "IDR",
  india: "INR",
  indonesia: "IDR",
  ireland: "EUR",
  italy: "EUR",
  japan: "JPY",
  jp: "JPY",
  kenya: "KES",
  kr: "KRW",
  kuwait: "KWD",
  laos: "LAK",
  latvia: "EUR",
  lithuania: "EUR",
  luxembourg: "EUR",
  malaysia: "MYR",
  malta: "EUR",
  mexico: "MXN",
  mm: "MMK",
  my: "MYR",
  myanmar: "MMK",
  netherlands: "EUR",
  newzealand: "NZD",
  "new zealand": "NZD",
  nigeria: "NGN",
  norway: "NOK",
  oman: "OMR",
  peru: "PEN",
  philippines: "PHP",
  ph: "PHP",
  poland: "PLN",
  portugal: "EUR",
  qatar: "QAR",
  saudiarabia: "SAR",
  "saudi arabia": "SAR",
  sg: "SGD",
  singapore: "SGD",
  slovakia: "EUR",
  slovenia: "EUR",
  southafrica: "ZAR",
  "south africa": "ZAR",
  southkorea: "KRW",
  "south korea": "KRW",
  spain: "EUR",
  sweden: "SEK",
  switzerland: "CHF",
  taiwan: "TWD",
  thailand: "THB",
  th: "THB",
  turkey: "TRY",
  uae: "AED",
  uk: "GBP",
  unitedarabemirates: "AED",
  "united arab emirates": "AED",
  unitedkingdom: "GBP",
  "united kingdom": "GBP",
  unitedstates: "USD",
  "united states": "USD",
  us: "USD",
  usa: "USD",
  vietnam: "VND",
  vn: "VND",
};

const getCurrencyFromCountry = (country?: string) => {
  const normalized = country?.trim().toLowerCase();
  if (!normalized) return undefined;

  return COUNTRY_CURRENCY_MAP[normalized] || COUNTRY_CURRENCY_MAP[normalized.replace(/[^a-z]/g, "")];
};

const getTotalPages = (total: number) => Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

const paginateItems = <T,>(items: T[], page: number) =>
  items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

type PortalSearchResult = {
  id: string;
  section: PortalSection;
  title: string;
  meta: string;
  amount?: string;
  Icon: React.ElementType;
  searchable: string;
};

function PortalGlobalSearch({
  invoices,
  quotations,
  contracts,
  locale,
  t,
  onOpenResult,
  mode = "inline",
  isMobileOpen = false,
  onCloseMobile,
}: {
  invoices: PortalDashboard["invoices"];
  quotations: PortalDashboard["quotations"];
  contracts: ToolkitItem[];
  locale: AppLocale;
  t: PortalTranslateFn;
  onOpenResult: (section: PortalSection, id: string) => void;
  mode?: "inline" | "mobile";
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mode === "mobile" && isMobileOpen) {
      window.setTimeout(() => mobileInputRef.current?.focus(), 50);
    }
  }, [isMobileOpen, mode]);

  const results: PortalSearchResult[] = !normalizedQuery
    ? []
    : [
        ...invoices.map((invoice) => ({
          id: invoice.id,
          section: "invoices" as const,
          title: invoice.invoice_number,
          meta: `${t("search.type.invoice")} • ${statusLabels[invoice.status] || invoice.status} • ${formatPortalDate(invoice.created_at, locale)}`,
          amount: formatCurrency(invoice.total, invoice.currency),
          Icon: GoogleDocIcon,
          searchable: [
            invoice.invoice_number,
            invoice.status,
            invoice.currency,
            formatCurrency(invoice.total, invoice.currency),
          ].join(" "),
        })),
        ...quotations.map((quotation) => ({
          id: quotation.id,
          section: "quotations" as const,
          title: quotation.quotation_number,
          meta: `${t("search.type.quotation")} • ${statusLabels[quotation.status] || quotation.status} • ${formatPortalDate(quotation.created_at, locale)}`,
          amount: formatCurrency(quotation.total, quotation.currency),
          Icon: SentIcon,
          searchable: [
            quotation.quotation_number,
            quotation.status,
            quotation.currency,
            formatCurrency(quotation.total, quotation.currency),
          ].join(" "),
        })),
        ...contracts.map((contract) => ({
          id: contract.id,
          section: "contracts" as const,
          title: contract.title,
          meta: `${t("portal.contracts")} • ${formatPortalDate(contract.created_at, locale)}`,
          Icon: LegalDocument01Icon,
          searchable: [
            contract.title,
            getStringValue(contract.content.body) || "",
          ].join(" "),
        })),
      ]
        .filter((result) =>
          `${result.title} ${result.meta} ${result.searchable}`.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 8);

  const handleOpenResult = (section: PortalSection, id: string) => {
    onOpenResult(section, id);
    setQuery("");
    setIsOpen(false);
    onCloseMobile?.();
  };

  const renderResults = (isMobile = false) => (
    <>
      {results.length > 0 ? (
        <>
          <div className="border-b border-border-color px-4 py-2 text-[11px] font-bold uppercase tracking-[0.6px] text-text-tertiary">
            {t("search.resultCount", { count: results.length })}
          </div>
          <div className={isMobile ? "flex-1 overflow-y-auto" : "max-h-[320px] overflow-y-auto"}>
            {results.map((result) => {
              const Icon = result.Icon;

              return (
                <button
                  key={`${result.section}-${result.id}`}
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-border-light px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-bg-hover"
                  onClick={() => handleOpenResult(result.section, result.id)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-900/20">
                    <Icon width={18} height={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-text-primary">
                      {result.title}
                    </span>
                    <span className="block truncate text-xs text-text-secondary">
                      {result.meta}
                    </span>
                  </span>
                  {result.amount && (
                    <span className="shrink-0 text-right text-xs font-bold text-text-primary">
                      {result.amount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="px-4 py-8 text-center text-sm text-text-secondary">
          {query.trim()
            ? t("search.noResultsFor", { query })
            : t("portal.searchPlaceholder")}
        </div>
      )}
    </>
  );

  if (mode === "mobile") {
    if (!isMobileOpen) return null;

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-bg-primary animate-fade-in lg:hidden">
        <div className="flex items-center gap-3 border-b border-border-color bg-bg-card px-4 py-3">
          <Search02Icon width={20} height={20} className="shrink-0 text-text-secondary" />
          <input
            ref={mobileInputRef}
            type="text"
            placeholder={t("portal.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => {
              setQuery("");
              onCloseMobile?.();
            }}
          >
            {t("common.close")}
          </button>
        </div>
        {renderResults(true)}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center justify-center opacity-50">
          <Search02Icon className="text-text-primary" width={18} height={18} />
        </span>
        <input
          type="text"
          placeholder={t("portal.searchPlaceholder")}
          className="w-full rounded-full border border-border-color bg-bg-secondary py-2.5 pl-10 pr-10 text-[13px] text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-red-400 focus:bg-bg-card focus:ring-3 focus:ring-red-500/10"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(Boolean(event.target.value.trim()));
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
        />
        {query && (
          <button
            type="button"
            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            aria-label={t("common.clear")}
            title={t("common.clear")}
          >
            <Cancel01Icon width={14} height={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-lg border border-border-color bg-bg-card shadow-2xl">
          {renderResults(false)}
        </div>
      )}
    </div>
  );
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [portalLocale, setPortalLocale] = useState<AppLocale>(defaultAppLocale);
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<PortalSection>("dashboard");
  const [invoicePage, setInvoicePage] = useState(1);
  const [quotationPage, setQuotationPage] = useState(1);
  const [contractPage, setContractPage] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Contract Viewer and Signing State
  const [activeContract, setActiveContract] = useState<ToolkitItem | null>(null);
  const [sigType, setSigType] = useState<"draw" | "upload">("draw");
  const [uploadedSig, setUploadedSig] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [sigError, setSigError] = useState("");
  const [paperSize, setPaperSize] = useState<ContractPaperSize>("a4");

  // Canvas Drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const locale = portalLocale;
  const t = useCallback<PortalTranslateFn>(
    (key, values) => translate(portalLocale, key, values),
    [portalLocale],
  );

  const setLocalPortalLocale = useCallback((nextLocale: AppLocale) => {
    setPortalLocale(nextLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(`invoiceque-portal-locale:${token}`, nextLocale);
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedLocale = localStorage.getItem(`invoiceque-portal-locale:${token}`);
    if (isAppLocale(storedLocale)) {
      setPortalLocale(storedLocale);
      return;
    }

    setPortalLocale(detectAppLocale(navigator.languages));
  }, [token]);

  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await portalApi.getPortal(token);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portal not found or expired");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // Handle drawing events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0F172A"; // dark slate ink
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // Prevent scrolling while drawing on mobile
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setSigError("Maksimal ukuran file adalah 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedSig(event.target.result as string);
        setSigError("");
      }
    };
    reader.readAsDataURL(file);
  };

  const submitSignature = async () => {
    if (!activeContract) return;
    setSigError("");
    let finalSig = "";

    if (sigType === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Let's verify if the canvas has any drawings on it
      // Simple verification: if canvas is completely empty (all pixels are transparent)
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        const hasContent = buffer.some(color => color !== 0);
        if (!hasContent) {
          setSigError("Silakan tulis tanda tangan Anda pada pad terlebih dahulu");
          return;
        }
      }
      finalSig = canvas.toDataURL("image/png");
    } else {
      if (!uploadedSig) {
        setSigError("Silakan unggah gambar file tanda tangan Anda");
        return;
      }
      finalSig = uploadedSig;
    }

    try {
      setSigning(true);
      const res = await portalApi.signContract(token, activeContract.id, finalSig);
      if (res.success) {
        // Success signature!
        // Refresh portal data to reflect signed document state
        const updatedPortal = await portalApi.getPortal(token);
        setData(updatedPortal);
        
        // Find updated contract to show
        const match = updatedPortal.contracts?.find((contract) => contract.id === activeContract.id);
        if (match) {
          setActiveContract(match);
        } else {
          setActiveContract(null);
        }
      } else {
        setSigError(res.message || "Gagal menandatangani kontrak");
      }
    } catch (err) {
      setSigError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses tanda tangan");
    } finally {
      setSigning(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-semibold">{t("portal.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 text-center max-w-md w-full border border-slate-200 dark:border-slate-700">
          <div className="text-5xl mb-4 text-red-600">
            <LockedIcon size={10} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
            {t("portal.unavailable")}
          </h2>
          <p className="text-slate-500 text-sm">
            {error || t("portal.unavailableHint")}
          </p>
        </div>
      </div>
    );
  }

  const accent = data.client.accent_color || "#DC2626";
  const contractsList = data.contracts || [];
  const activeContent = activeContract?.content || {};
  const firstPartySignature = getStringValue(activeContent.first_party_sig);
  const secondPartySignature = getStringValue(activeContent.second_party_sig);
  const firstPartySignedAt = getStringValue(activeContent.first_party_signed_at);
  const secondPartySignedAt = getStringValue(activeContent.second_party_signed_at);
  const invoiceTotalPages = getTotalPages(data.invoices.length);
  const quotationTotalPages = getTotalPages(data.quotations.length);
  const contractTotalPages = getTotalPages(contractsList.length);
  const paginatedInvoices = paginateItems(data.invoices, Math.min(invoicePage, invoiceTotalPages));
  const paginatedQuotations = paginateItems(data.quotations, Math.min(quotationPage, quotationTotalPages));
  const paginatedContracts = paginateItems(contractsList, Math.min(contractPage, contractTotalPages));
  const dashboardInvoices = data.invoices.slice(0, 5);
  const dashboardQuotations = data.quotations.slice(0, 5);
  const dashboardContracts = contractsList.slice(0, 5);
  const currencyCandidates = [
    ...data.invoices.map((invoice) => invoice.currency),
    ...data.quotations.map((quotation) => quotation.currency),
  ].filter(Boolean);
  const clientCountryCurrency = getCurrencyFromCountry(data.client.country);
  const dashboardCurrency = currencyCandidates[0]?.toUpperCase() || clientCountryCurrency || "IDR";
  const totalPaidByCurrency = data.invoices.reduce<Record<string, number>>((totals, invoice) => {
    const currency = (invoice.currency || dashboardCurrency).toUpperCase();
    totals[currency] = (totals[currency] || 0) + (invoice.amount_paid || 0);
    return totals;
  }, {});
  const outstandingByCurrency = data.invoices.reduce<Record<string, number>>((totals, invoice) => {
    const currency = (invoice.currency || dashboardCurrency).toUpperCase();
    totals[currency] = (totals[currency] || 0) + (invoice.amount_remaining || 0);
    return totals;
  }, {});
  const getCurrencyBreakdown = (
    totals: Record<string, number>,
    fallbackAmount: number,
  ) => {
    const entries = Object.entries(totals).filter(([, amount]) => amount !== 0);

    if (entries.length === 0) {
      return [formatCurrency(fallbackAmount, dashboardCurrency)];
    }

    return entries.map(([currency, amount]) => formatCurrency(amount, currency));
  };
  const totalPaidValues = getCurrencyBreakdown(totalPaidByCurrency, data.stats.total_paid);
  const outstandingValues = getCurrencyBreakdown(outstandingByCurrency, data.stats.total_outstanding);
  const sidebarItems: Array<{
    id: PortalSection;
    label: string;
    count?: number;
    Icon: React.ElementType;
  }> = [
    { id: "dashboard", label: t("nav.dashboard"), Icon: Home01Icon },
    { id: "invoices", label: t("invoices.title"), count: data.invoices.length, Icon: GoogleDocIcon },
    { id: "quotations", label: t("quotations.title"), count: data.quotations.length, Icon: SentIcon },
    { id: "contracts", label: t("portal.contracts"), count: contractsList.length, Icon: LegalDocument01Icon },
  ];
  const activeSectionMeta = sidebarItems.find((item) => item.id === activeSection) || sidebarItems[0];
  const openPortalSearchResult = (section: PortalSection, id: string) => {
    setActiveContract(null);
    setUploadedSig(null);
    setSigError("");

    if (section === "invoices") {
      const index = data.invoices.findIndex((invoice) => invoice.id === id);
      if (index >= 0) {
        setInvoicePage(Math.floor(index / ITEMS_PER_PAGE) + 1);
      }
      setActiveSection("invoices");
      return;
    }

    if (section === "quotations") {
      const index = data.quotations.findIndex((quotation) => quotation.id === id);
      if (index >= 0) {
        setQuotationPage(Math.floor(index / ITEMS_PER_PAGE) + 1);
      }
      setActiveSection("quotations");
      return;
    }

    const contract = contractsList.find((item) => item.id === id);
    if (contract) {
      setActiveContract(contract);
    } else {
      const index = contractsList.findIndex((item) => item.id === id);
      if (index >= 0) {
        setContractPage(Math.floor(index / ITEMS_PER_PAGE) + 1);
      }
      setActiveSection("contracts");
    }
  };

  const renderPagination = (
    total: number,
    currentPage: number,
    totalPages: number,
    setPage: React.Dispatch<React.SetStateAction<number>>,
  ) => {
    if (total === 0) return null;
    const safePage = Math.min(currentPage, totalPages);

    return (
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border border-border-color bg-bg-card rounded-lg">
        <div className="text-sm text-text-secondary text-center sm:text-left">
          {t("common.showingRange", {
            from: (safePage - 1) * ITEMS_PER_PAGE + 1,
            to: Math.min(safePage * ITEMS_PER_PAGE, total),
            total,
          })}
        </div>
        <div className="flex gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
          <button
            className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
            onClick={() => setPage((page) => Math.max(1, page - 1))}
            disabled={safePage === 1}
          >
            {t("common.previous")}
          </button>
          <div className="flex items-center justify-center px-3 text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md min-w-[50px]">
            {safePage} / {totalPages}
          </div>
          <button
            className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
            onClick={() => setPage((page) => Math.min(totalPages, page + 1))}
            disabled={safePage === totalPages}
          >
            {t("common.next")}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-card"
      style={{ "--portal-sidebar-width": isSidebarCollapsed ? "80px" : "260px" } as React.CSSProperties}
    >
      <ContractPrintStyle paperSize={paperSize} rootSelector="#portal-contract-print-pages" />

      {isMobileSidebarOpen && (
        <button
          type="button"
          className="no-print fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label={t("common.close")}
        />
      )}

      <aside className={`no-print fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col overflow-visible border-r border-white/10 bg-gradient-to-br from-red-950 via-red-900 to-red-800 transition-all duration-300 lg:z-20 lg:w-[var(--portal-sidebar-width)] ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-none">
          <div className="absolute -right-16 -top-16 h-[200px] w-[200px] rounded-full bg-white/5" />
          <div className="absolute -left-10 bottom-[20%] h-[140px] w-[140px] rounded-full bg-white/5" />
          <div className="absolute right-[5%] top-[45%] h-[80px] w-[80px] rounded-full bg-white/[0.03]" />
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((value) => !value)}
          className="absolute -right-3 top-[30px] z-20 hidden h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition-all duration-150 hover:scale-110 hover:bg-red-50 lg:flex"
          aria-label={t("header.toggleMenu")}
          title={t("header.toggleMenu")}
        >
          {isSidebarCollapsed ? (
            <ArrowRight01Icon width={16} height={16} />
          ) : (
            <ArrowLeft01Icon width={16} height={16} />
          )}
        </button>
        <div className={`relative z-10 flex h-full flex-col ${isSidebarCollapsed ? "lg:overflow-visible" : "overflow-x-hidden"}`}>
          <div className={`flex items-center gap-3 py-4 ${isSidebarCollapsed ? "px-5 lg:justify-center lg:px-0" : "px-5"}`}>
            {data.client.business_logo ? (
              <Image
                src={data.client.business_logo}
                alt={data.client.business_name || "Business Logo"}
                width={42}
                height={42}
                unoptimized
                className={`${isSidebarCollapsed ? "h-[42px] w-[42px] lg:h-12 lg:w-12" : "h-[42px] w-[42px]"} shrink-0 rounded-md bg-white/10 object-contain`}
              />
            ) : (
              <div
                className={`${isSidebarCollapsed ? "h-[42px] w-[42px] text-sm lg:h-8 lg:w-8 lg:text-xs" : "h-[42px] w-[42px] text-sm"} flex shrink-0 items-center justify-center rounded-md bg-white/15 font-extrabold text-white`}
              >
                {(data.client.business_name || "IQ").substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className={`min-w-0 ${isSidebarCollapsed ? "lg:hidden" : ""}`}>
              <h1 className="truncate text-lg font-extrabold tracking-tight text-white">
                {data.client.business_name || t("portal.title")}
              </h1>
              <p className="truncate text-[11px] font-medium text-white/60">
                {data.client.name}
              </p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
            <div className={`${isSidebarCollapsed ? "hidden lg:my-2 lg:block lg:border-t lg:border-white/15" : "hidden"}`} />
            <div className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] text-white/50 ${isSidebarCollapsed ? "lg:hidden" : ""}`}>
              Menu
            </div>
            {sidebarItems.map((item) => {
              const Icon = item.Icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`relative mb-2 flex w-full items-center gap-3 rounded-md px-4 py-5 text-left text-[13px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-white/20 text-white font-semibold"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  } ${isSidebarCollapsed ? "lg:justify-center lg:px-3" : ""}`}
                >
                  <Icon width={18} height={18} className={active ? "text-white" : "text-white/80"} />
                  <span className={`flex-1 truncate ${isSidebarCollapsed ? "lg:hidden" : ""}`}>{item.label}</span>
                  {typeof item.count === "number" && (
                    <span className={`rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white ${isSidebarCollapsed ? "lg:hidden" : ""}`}>
                      {item.count}
                    </span>
                  )}
                  {active && <div className="absolute right-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-[3px] bg-white" />}
                </button>
              );
            })}
          </nav>

          <div className={`relative z-10 border-t border-white/10 p-4 lg:block hidden ${isSidebarCollapsed ? "lg:flex lg:justify-center lg:px-2" : ""}`}>
            <PortalLanguageSwitcher
              locale={portalLocale}
              onChange={setLocalPortalLocale}
              t={t}
              align={isSidebarCollapsed ? "left" : "right"}
              variant="sidebar"
              placement="top"
            />
          </div>
        </div>
      </aside>

      <div className="no-print relative z-30 overflow-visible border-b border-white/10 bg-gradient-to-br from-red-950 via-red-900 to-red-800 px-4 py-4 lg:hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/15"
              aria-label={t("header.toggleMenu")}
              title={t("header.toggleMenu")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {data.client.business_logo ? (
              <Image
                src={data.client.business_logo}
                alt={data.client.business_name || "Business Logo"}
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 shrink-0 rounded-md bg-white/10 object-contain"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/15 text-xs font-extrabold text-white">
                {(data.client.business_name || "IQ").substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-white">
                {data.client.business_name || t("portal.title")}
              </h1>
              <p className="truncate text-xs text-white/60">{data.client.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/15"
              aria-label={t("search.placeholder")}
              title={t("search.placeholder")}
            >
              <Search02Icon width={20} height={20} />
            </button>
            <PortalLanguageSwitcher
              locale={portalLocale}
              onChange={setLocalPortalLocale}
              t={t}
              variant="sidebar"
              menuMode="fixed"
            />
          </div>
        </div>
      </div>

      <PortalGlobalSearch
        invoices={data.invoices}
        quotations={data.quotations}
        contracts={contractsList}
        locale={locale}
        t={t}
        onOpenResult={openPortalSearchResult}
        mode="mobile"
        isMobileOpen={isMobileSearchOpen}
        onCloseMobile={() => setIsMobileSearchOpen(false)}
      />

      <main className="px-4 py-6 transition-[margin-left] duration-300 sm:px-6 lg:ml-[var(--portal-sidebar-width)] lg:px-8">
        {/* Active Contract View Mode */}
        {activeContract ? (
          <div className="space-y-6">
            {/* Navigation back and header options */}
            <div className="flex flex-wrap items-center justify-between gap-4 no-print border-b pb-4 mb-4">
              <button
                onClick={() => {
                  setActiveContract(null);
                  setUploadedSig(null);
                  setSigError("");
                }}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-all dark:text-slate-400 dark:hover:text-slate-200"
              >
                ← {t("portal.backToSummary")}
              </button>
              
              <div className="flex flex-wrap items-center justify-end gap-2">
                <ContractPaperSizePicker value={paperSize} onChange={setPaperSize} />
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                >
                  <PrinterIcon />
                  {t("portal.printPdf")}
                </button>
              </div>
            </div>

            {/* Main Styled Sheet Column */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Paper Sheet Document Preview */}
              <div className="lg:col-span-2 space-y-4">
                <ContractPaperPreview
                  rootId="portal-contract-print-pages"
                  paperSize={paperSize}
                  documentTitle={activeContract.title}
                  documentLabel={t("portal.contracts").toUpperCase()}
                  reference={`IQ-CTR-${activeContract.id.substring(0, 8).toUpperCase()}`}
                  officialLabel={t("portal.officialDocument")}
                  bodyText={getStringValue(activeContent.body) || ""}
                  companyName={data.client.business_name || "INVOICEQU"}
                  logoUrl={data.client.business_logo || undefined}
                  logoAlt={data.client.business_name || "Business Logo"}
                  email={data.client.business_email || undefined}
                  phone={data.client.business_phone || undefined}
                  website={data.client.business_website || undefined}
                  firstPartyLabel={t("portal.party1")}
                  firstPartyName={getStringValue(activeContent.first_party_name) || data.client.business_name || "Authorized Partner"}
                  firstPartySignature={firstPartySignature || null}
                  firstPartyDateText={firstPartySignedAt ? formatPortalDate(firstPartySignedAt, locale) : "____/____/________"}
                  firstPartyUnsignedText={`[${t("portal.unsigned")}]`}
                  secondPartyLabel={t("portal.party2")}
                  secondPartyName={getStringValue(activeContent.second_party_name) || data.client.name}
                  secondPartySignature={secondPartySignature || null}
                  secondPartyDateText={secondPartySignedAt ? formatPortalDate(secondPartySignedAt, locale) : "____/____/________"}
                  secondPartyUnsignedText={`[${t("portal.unsigned")}]`}
                  footerId={activeContract.id}
                />
              </div>

              {/* Sidebar Action / Signature Panel */}
              <div className="lg:col-span-1 space-y-4 no-print">
                <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm space-y-4">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    {t("portal.documentStatus")}
                  </h4>

                  {secondPartySignature ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs space-y-2 border border-emerald-200 dark:border-emerald-900/50">
                      <p className="font-bold flex items-center gap-1.5">
                        ✓ {t("portal.signedComplete")}
                      </p>
                      <p>
                        {t("portal.signedOn")}{" "}
                        <strong>
                          {formatPortalDate(secondPartySignedAt || "", locale)}
                        </strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-lg text-xs space-y-2 border border-amber-200 dark:border-amber-900/50">
                      <p className="font-bold">
                        ⏱ {t("portal.needsYourSignature")}
                      </p>
                      <p>
                        {t("portal.signature.instruction")}
                      </p>
                    </div>
                  )}

                  {!secondPartySignature && (
                    <div className="pt-2 space-y-3">
                      <div className="flex border-b border-border-color text-xs">
                        <button
                          type="button"
                          onClick={() => setSigType("draw")}
                          className={`flex-1 pb-2 font-semibold text-center border-b-2 transition-all ${sigType === "draw" ? "border-red-600 text-red-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                        >
                          {t("portal.signature.draw")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSigType("upload")}
                          className={`flex-1 pb-2 font-semibold text-center border-b-2 transition-all ${sigType === "upload" ? "border-red-600 text-red-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                        >
                          {t("portal.signature.upload")}
                        </button>
                      </div>

                      {sigType === "draw" ? (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-400">
                            {t("portal.signature.drawInstruction")}
                          </p>
                          <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden relative h-40">
                            <canvas
                              ref={canvasRef}
                              width={320}
                              height={160}
                              className="w-full h-full cursor-crosshair block touch-none"
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                              onTouchStart={startDrawing}
                              onTouchMove={draw}
                              onTouchEnd={stopDrawing}
                            />
                            <button
                              type="button"
                              onClick={clearCanvas}
                              className="absolute right-2 bottom-2 bg-slate-200 dark:bg-slate-800 text-[10px] px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 font-medium transition-all"
                            >
                              {t("portal.clearPad")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-400">
                            {t("portal.signature.uploadInstruction")}
                          </p>
                          {uploadedSig ? (
                            <div className="border rounded-lg p-3 bg-slate-100 dark:bg-slate-900 flex items-center justify-between gap-3">
                              <img
                                src={uploadedSig}
                                alt="Signature Preview"
                                className="h-12 object-contain mix-blend-multiply dark:mix-blend-normal"
                              />
                              <button
                                type="button"
                                onClick={() => setUploadedSig(null)}
                                className="text-red-500 hover:text-red-700 p-1.5"
                                title="Remove image"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ) : (
                            <label className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-slate-100/50 dark:hover:bg-slate-900/50 cursor-pointer transition-all">
                              <span className="text-xs text-slate-500 font-medium">{t("portal.signature.clickToChoose")}</span>
                              <span className="text-[9px] text-slate-400 mt-1">{t("portal.signature.uploadHint")}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      )}

                      {sigError && (
                        <p className="text-[10px] text-red-500 font-medium bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          ⚠️ {sigError}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={submitSignature}
                        disabled={signing}
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-50"
                      >
                        {signing ? t("portal.signing") : t("portal.approveAndSign")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                  {t("portal.summary")}
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                  {activeSectionMeta.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t("portal.welcome").replace("{name}", data.client.name)}
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:max-w-[420px] sm:items-end">
                <PortalGlobalSearch
                  invoices={data.invoices}
                  quotations={data.quotations}
                  contracts={contractsList}
                  locale={locale}
                  t={t}
                  onOpenResult={openPortalSearchResult}
                />
                <div className="text-left text-xs text-slate-500 sm:text-right">
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    {data.client.business_name || t("portal.title")}
                  </p>
                  {data.client.business_email && <p>{data.client.business_email}</p>}
                  {data.client.business_phone && <p>{data.client.business_phone}</p>}
                </div>
              </div>
            </div>

            {activeSection === "dashboard" && (
              <section className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-border-color bg-bg-card p-5 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">
                      {t("portal.totalInvoices")}
                    </span>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                      {data.stats.total_invoices}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border-color bg-bg-card p-5 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">
                      {t("portal.totalPaid")}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {totalPaidValues.map((value) => (
                        <p
                          key={value}
                          className={`${totalPaidValues.length > 1 ? "text-xl" : "text-2xl"} font-extrabold text-emerald-600`}
                        >
                          {value}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-color bg-bg-card p-5 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">
                      {t("portal.outstanding")}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {outstandingValues.map((value) => (
                        <p
                          key={value}
                          className={`${outstandingValues.length > 1 ? "text-xl" : "text-2xl"} font-extrabold text-red-600`}
                        >
                          {value}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-color bg-bg-card p-5 shadow-sm">
                    <span className="text-xs font-medium text-slate-500">
                      {t("portal.contracts")}
                    </span>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                      {contractsList.length}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="overflow-hidden rounded-lg border border-border-color bg-bg-card shadow-sm">
                    <div className="border-b border-border-color px-5 py-4">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {t("invoices.title")}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="border-b border-border-color bg-bg-secondary text-xs uppercase text-text-secondary">
                          <tr>
                            <th className="px-5 py-3 text-left font-bold">{t("invoices.title")}</th>
                            <th className="px-5 py-3 text-left font-bold">Status</th>
                            <th className="px-5 py-3 text-right font-bold">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                          {dashboardInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-500">
                                {t("portal.noInvoices")}
                              </td>
                            </tr>
                          ) : (
                            dashboardInvoices.map((inv) => (
                              <tr key={inv.id} className="transition-colors hover:bg-bg-hover">
                                <td className="px-5 py-4">
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {inv.invoice_number}
                                  </p>
                                  <p className="text-xs text-text-secondary">
                                    {formatPortalDate(inv.created_at, locale)}
                                  </p>
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[inv.status] || "bg-slate-100 text-slate-600"}`}>
                                    {statusLabels[inv.status] || inv.status}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(inv.total, inv.currency)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-border-color bg-bg-card shadow-sm">
                    <div className="border-b border-border-color px-5 py-4">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {t("quotations.title")}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="border-b border-border-color bg-bg-secondary text-xs uppercase text-text-secondary">
                          <tr>
                            <th className="px-5 py-3 text-left font-bold">{t("quotations.number")}</th>
                            <th className="px-5 py-3 text-left font-bold">Status</th>
                            <th className="px-5 py-3 text-right font-bold">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                          {dashboardQuotations.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-500">
                                {t("portal.noQuotations")}
                              </td>
                            </tr>
                          ) : (
                            dashboardQuotations.map((qt) => (
                              <tr key={qt.id} className="transition-colors hover:bg-bg-hover">
                                <td className="px-5 py-4">
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {qt.quotation_number}
                                  </p>
                                  <p className="text-xs text-text-secondary">
                                    {formatPortalDate(qt.created_at, locale)}
                                  </p>
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[qt.status] || "bg-slate-100 text-slate-600"}`}>
                                    {statusLabels[qt.status] || qt.status}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(qt.total, qt.currency)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border-color bg-bg-card shadow-sm">
                  <div className="border-b border-border-color px-5 py-4">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {t("portal.contracts")}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="border-b border-border-color bg-bg-secondary text-xs uppercase text-text-secondary">
                        <tr>
                          <th className="px-5 py-3 text-left font-bold">{t("common.title")}</th>
                          <th className="px-5 py-3 text-left font-bold">{t("common.created")}</th>
                          <th className="px-5 py-3 text-left font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {dashboardContracts.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-500">
                              {t("portal.noContracts")}
                            </td>
                          </tr>
                        ) : (
                          dashboardContracts.map((ctr) => {
                            const firstSig = getStringValue(ctr.content.first_party_sig);
                            const secondSig = getStringValue(ctr.content.second_party_sig);
                            const isSigned = !!firstSig && !!secondSig;
                            const onlyFirst = !!firstSig && !secondSig;
                            const contractStatusClass = isSigned
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : onlyFirst
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

                            return (
                              <tr key={ctr.id} className="transition-colors hover:bg-bg-hover">
                                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                                  {ctr.title}
                                </td>
                                <td className="px-5 py-4 text-text-secondary">
                                  {formatPortalDate(ctr.created_at, locale)}
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${contractStatusClass}`}>
                                    {isSigned ? t("portal.signedComplete") : onlyFirst ? t("portal.needsYourSignature") : t("portal.waitingForSignature")}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "invoices" && (
              <section>
                <div className="overflow-hidden rounded-lg border border-border-color bg-bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead className="border-b border-border-color bg-bg-secondary text-xs uppercase text-text-secondary">
                        <tr>
                          <th className="px-5 py-3 text-left font-bold">{t("invoices.title")}</th>
                          <th className="px-5 py-3 text-left font-bold">{t("portal.issued")}</th>
                          <th className="px-5 py-3 text-left font-bold">{t("portal.due")}</th>
                          <th className="px-5 py-3 text-left font-bold">Status</th>
                          <th className="px-5 py-3 text-right font-bold">Total</th>
                          <th className="px-5 py-3 text-right font-bold">{t("portal.remaining")}</th>
                          <th className="px-5 py-3 text-right font-bold">{t("common.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {data.invoices.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                              {t("portal.noInvoices")}
                            </td>
                          </tr>
                        ) : (
                          paginatedInvoices.map((inv) => (
                            <tr key={inv.id} className="transition-colors hover:bg-bg-hover">
                              <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                                {inv.invoice_number}
                              </td>
                              <td className="px-5 py-4 text-text-secondary">
                                {formatPortalDate(inv.created_at, locale)}
                              </td>
                              <td className="px-5 py-4 text-text-secondary">
                                {inv.due_date ? formatPortalDate(inv.due_date, locale) : "-"}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[inv.status] || "bg-slate-100 text-slate-600"}`}>
                                  {statusLabels[inv.status] || inv.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                                {formatCurrency(inv.total, inv.currency)}
                              </td>
                              <td className="px-5 py-4 text-right font-semibold text-text-secondary">
                                {inv.status !== "paid" && inv.amount_remaining > 0
                                  ? formatCurrency(inv.amount_remaining, inv.currency)
                                  : "-"}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {inv.payment_link && inv.status !== "paid" ? (
                                  <a
                                    href={inv.payment_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-bold text-white transition-all hover:opacity-90"
                                    style={{ background: accent }}
                                  >
                                    {t("portal.payNow")}
                                  </a>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {renderPagination(data.invoices.length, invoicePage, invoiceTotalPages, setInvoicePage)}
              </section>
            )}

            {activeSection === "quotations" && (
              <section>
                <div className="overflow-hidden rounded-lg border border-border-color bg-bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="border-b border-border-color bg-bg-secondary text-xs uppercase text-text-secondary">
                        <tr>
                          <th className="px-5 py-3 text-left font-bold">{t("quotations.number")}</th>
                          <th className="px-5 py-3 text-left font-bold">{t("portal.issued")}</th>
                          <th className="px-5 py-3 text-left font-bold">{t("quotations.validUntil")}</th>
                          <th className="px-5 py-3 text-left font-bold">Status</th>
                          <th className="px-5 py-3 text-right font-bold">Total</th>
                          <th className="px-5 py-3 text-right font-bold">{t("common.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {data.quotations.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                              {t("portal.noQuotations")}
                            </td>
                          </tr>
                        ) : (
                          paginatedQuotations.map((qt) => (
                            <tr key={qt.id} className="transition-colors hover:bg-bg-hover">
                              <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                                {qt.quotation_number}
                              </td>
                              <td className="px-5 py-4 text-text-secondary">
                                {formatPortalDate(qt.created_at, locale)}
                              </td>
                              <td className="px-5 py-4 text-text-secondary">
                                {qt.valid_until ? formatPortalDate(qt.valid_until, locale) : "-"}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[qt.status] || "bg-slate-100 text-slate-600"}`}>
                                  {statusLabels[qt.status] || qt.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                                {formatCurrency(qt.total, qt.currency)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {qt.status === "sent" && qt.accept_token ? (
                                  <a
                                    href={`/quotation/accept/${qt.accept_token}`}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700"
                                  >
                                    <ValidationApprovalIcon width={16} height={16} />
                                    {t("portal.acceptQuotation")}
                                  </a>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {renderPagination(data.quotations.length, quotationPage, quotationTotalPages, setQuotationPage)}
              </section>
            )}

            {activeSection === "contracts" && (
              <section>
                <div className="overflow-hidden rounded-lg border border-border-color bg-bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead className="border-b border-border-color bg-bg-secondary text-xs uppercase text-text-secondary">
                        <tr>
                          <th className="px-5 py-3 text-left font-bold">{t("common.title")}</th>
                          <th className="px-5 py-3 text-left font-bold">{t("common.created")}</th>
                          <th className="px-5 py-3 text-left font-bold">Status</th>
                          <th className="px-5 py-3 text-right font-bold">{t("common.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {contractsList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                              {t("portal.noContracts")}
                            </td>
                          </tr>
                        ) : (
                          paginatedContracts.map((ctr) => {
                            const firstSig = getStringValue(ctr.content.first_party_sig);
                            const secondSig = getStringValue(ctr.content.second_party_sig);
                            const isSigned = !!firstSig && !!secondSig;
                            const onlyFirst = !!firstSig && !secondSig;
                            const contractStatusClass = isSigned
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : onlyFirst
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

                            return (
                              <tr key={ctr.id} className="transition-colors hover:bg-bg-hover">
                                <td className="px-5 py-4">
                                  <p className="max-w-[360px] truncate font-bold text-slate-900 dark:text-white">
                                    {ctr.title}
                                  </p>
                                </td>
                                <td className="px-5 py-4 text-text-secondary">
                                  {formatPortalDate(ctr.created_at, locale)}
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${contractStatusClass}`}>
                                    {isSigned ? t("portal.signedComplete") : onlyFirst ? t("portal.needsYourSignature") : t("portal.waitingForSignature")}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveContract(ctr);
                                    }}
                                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-bold text-white transition-all hover:opacity-90"
                                    style={{ background: accent }}
                                  >
                                    {t("portal.viewAndSign")}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {renderPagination(contractsList.length, contractPage, contractTotalPages, setContractPage)}
              </section>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
