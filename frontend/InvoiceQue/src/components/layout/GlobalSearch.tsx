"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  invoiceApi,
  clientApi,
  paymentLinkApi,
  quotationApi,
  taskApi,
  projectApi,
  chaserApi,
  timeEntryApi,
  portalApi,
  meetingApi,
  type Invoice,
  type Client,
  type PaymentLink,
  type Quotation,
  type Task,
  type Project,
  type PaymentChaser,
  type TimeEntry,
  type PortalToken,
  type Meeting,
} from "@/lib/api";
import { formatCurrency, getStatusColor, formatDate } from "@/lib/utils";
import {
  Search02Icon,
  GoogleDocIcon,
  UserGroupIcon,
  Payment01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Loading03Icon,
  SentIcon,
  Task01Icon,
  Folder01Icon,
  Alert01Icon,
  Clock01Icon,
  Calendar03Icon,
  Link04Icon,
} from "hugeicons-react";
import Portal from "@/components/ui/Portal";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/app-i18n";

// ── Types ──────────────────────────────────────────────

type ResultType =
  | "invoice"
  | "client"
  | "payment"
  | "quotation"
  | "task"
  | "project"
  | "meeting"
  | "chaser"
  | "timeentry"
  | "portal"
  | "navigation";

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  meta?: string;
  status?: string;
  href: string;
}

interface QuickNavPage {
  id: string;
  type: "navigation";
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  href: string;
}

// ── Quick-nav pages ────────────────────────────────────

const quickNavPages: QuickNavPage[] = [
  {
    id: "nav-dashboard",
    type: "navigation",
    titleKey: "nav.dashboard",
    subtitleKey: "search.quick.dashboard.subtitle",
    href: "/",
  },
  {
    id: "nav-invoices",
    type: "navigation",
    titleKey: "nav.invoices",
    subtitleKey: "search.quick.invoices.subtitle",
    href: "/invoices",
  },
  {
    id: "nav-invoices-create",
    type: "navigation",
    titleKey: "search.quick.invoiceCreate.title",
    subtitleKey: "search.quick.invoiceCreate.subtitle",
    href: "/invoices/create",
  },
  {
    id: "nav-invoices-outstanding",
    type: "navigation",
    titleKey: "nav.outstandingInvoices",
    subtitleKey: "search.quick.outstanding.subtitle",
    href: "/invoices/outstanding",
  },
  {
    id: "nav-quotations",
    type: "navigation",
    titleKey: "search.quick.quotations.title",
    subtitleKey: "search.quick.quotations.subtitle",
    href: "/quotations",
  },
  {
    id: "nav-payments",
    type: "navigation",
    titleKey: "search.quick.payments.title",
    subtitleKey: "search.quick.payments.subtitle",
    href: "/payments",
  },
  {
    id: "nav-clients",
    type: "navigation",
    titleKey: "nav.clientList",
    subtitleKey: "search.quick.clients.subtitle",
    href: "/clients",
  },
  {
    id: "nav-portal",
    type: "navigation",
    titleKey: "search.quick.portal.title",
    subtitleKey: "search.quick.portal.subtitle",
    href: "/portal",
  },
  {
    id: "nav-crm",
    type: "navigation",
    titleKey: "nav.crm",
    subtitleKey: "search.quick.crm.subtitle",
    href: "/crm",
  },
  {
    id: "nav-tasks",
    type: "navigation",
    titleKey: "search.quick.tasks.title",
    subtitleKey: "search.quick.tasks.subtitle",
    href: "/tasks",
  },
  {
    id: "nav-tasks-list",
    type: "navigation",
    titleKey: "search.quick.taskList.title",
    subtitleKey: "search.quick.taskList.subtitle",
    href: "/tasks/list",
  },
  {
    id: "nav-tasks-dashboard",
    type: "navigation",
    titleKey: "search.quick.taskDashboard.title",
    subtitleKey: "search.quick.taskDashboard.subtitle",
    href: "/tasks/dashboard",
  },
  {
    id: "nav-projects",
    type: "navigation",
    titleKey: "search.quick.projects.title",
    subtitleKey: "search.quick.projects.subtitle",
    href: "/projects",
  },
  {
    id: "nav-time",
    type: "navigation",
    titleKey: "search.quick.time.title",
    subtitleKey: "search.quick.time.subtitle",
    href: "/time-tracking",
  },
  {
    id: "nav-calendar",
    type: "navigation",
    titleKey: "nav.calendar",
    subtitleKey: "search.quick.calendar.subtitle",
    href: "/calendar",
  },
  {
    id: "nav-meetings",
    type: "navigation",
    titleKey: "search.quick.meetings.title",
    subtitleKey: "search.quick.meetings.subtitle",
    href: "/meetings",
  },
  {
    id: "nav-chasers",
    type: "navigation",
    titleKey: "search.quick.chasers.title",
    subtitleKey: "search.quick.chasers.subtitle",
    href: "/chasers",
  },
  {
    id: "nav-health",
    type: "navigation",
    titleKey: "search.quick.health.title",
    subtitleKey: "search.quick.health.subtitle",
    href: "/health",
  },
  {
    id: "nav-reports",
    type: "navigation",
    titleKey: "nav.reports",
    subtitleKey: "search.quick.reports.subtitle",
    href: "/reports",
  },
  {
    id: "nav-settings",
    type: "navigation",
    titleKey: "header.settings",
    subtitleKey: "search.quick.settings.subtitle",
    href: "/settings",
  },
  {
    id: "nav-notifications",
    type: "navigation",
    titleKey: "header.notifications",
    subtitleKey: "search.quick.notifications.subtitle",
    href: "/notifications",
  },
  {
    id: "nav-subscription",
    type: "navigation",
    titleKey: "search.quick.subscription.title",
    subtitleKey: "search.quick.subscription.subtitle",
    href: "/subscription",
  },
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

const TYPE_META: Record<
  ResultType,
  { labelKey: TranslationKey; color: string; icon: React.ReactNode }
> = {
  invoice: {
    labelKey: "search.type.invoice",
    color: "text-blue-500 bg-blue-50 dark:bg-blue-900/30",
    icon: <GoogleDocIcon width={16} height={16} />,
  },
  client: {
    labelKey: "search.type.client",
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30",
    icon: <UserGroupIcon width={16} height={16} />,
  },
  payment: {
    labelKey: "search.type.payment",
    color: "text-amber-500 bg-amber-50 dark:bg-amber-900/30",
    icon: <Payment01Icon width={16} height={16} />,
  },
  quotation: {
    labelKey: "search.type.quotation",
    color: "text-violet-500 bg-violet-50 dark:bg-violet-900/30",
    icon: <SentIcon width={16} height={16} />,
  },
  task: {
    labelKey: "search.type.task",
    color: "text-orange-500 bg-orange-50 dark:bg-orange-900/30",
    icon: <Task01Icon width={16} height={16} />,
  },
  project: {
    labelKey: "search.type.project",
    color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30",
    icon: <Folder01Icon width={16} height={16} />,
  },
  meeting: {
    labelKey: "search.type.meeting",
    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30",
    icon: <Calendar03Icon width={16} height={16} />,
  },
  chaser: {
    labelKey: "search.type.chaser",
    color: "text-red-500 bg-red-50 dark:bg-red-900/30",
    icon: <Alert01Icon width={16} height={16} />,
  },
  timeentry: {
    labelKey: "search.type.timeentry",
    color: "text-teal-500 bg-teal-50 dark:bg-teal-900/30",
    icon: <Clock01Icon width={16} height={16} />,
  },
  portal: {
    labelKey: "search.type.portal",
    color: "text-pink-500 bg-pink-50 dark:bg-pink-900/30",
    icon: <Link04Icon width={16} height={16} />,
  },
  navigation: {
    labelKey: "search.type.navigation",
    color: "text-rose-500 bg-rose-50 dark:bg-rose-900/30",
    icon: <ArrowRight01Icon width={16} height={16} />,
  },
};

const TYPE_ORDER: ResultType[] = [
  "navigation",
  "invoice",
  "quotation",
  "client",
  "task",
  "project",
  "meeting",
  "payment",
  "chaser",
  "timeentry",
  "portal",
];

// ── Component ──────────────────────────────────────────

export default function GlobalSearch({ mobileOpen: externalMobileOpen, onCloseMobile }: { mobileOpen?: boolean; onCloseMobile?: () => void } = {}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobileOpen = externalMobileOpen !== undefined ? externalMobileOpen : mobileOpen;
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  const localizedQuickNavPages = useMemo<SearchResult[]>(
    () =>
      quickNavPages.map((page) => ({
        id: page.id,
        type: page.type,
        title: t(page.titleKey),
        subtitle: t(page.subtitleKey),
        href: page.href,
      })),
    [t],
  );

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
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Search logic ─────────────────────────────────────

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const q = searchQuery.toLowerCase();

      // Quick-nav filter (instant, no API)
      const navResults: SearchResult[] = localizedQuickNavPages
        .filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.subtitle.toLowerCase().includes(q),
        )
        .slice(0, 5);

      try {
      const [
        invoicesRes,
        clientsRes,
        paymentsRes,
        quotationsRes,
        tasksRes,
        projectsRes,
        meetingsRes,
        chasersRes,
        timeRes,
        portalRes,
      ] = await Promise.allSettled([
        invoiceApi.list(undefined, 0, 50),
        clientApi.list(undefined, 1, 50),
        paymentLinkApi.list(1, 50),
        quotationApi.list(undefined, 1, 50),
        taskApi.list({ per_page: 50 }),
        projectApi.list({ per_page: 50 }),
        meetingApi.list({ per_page: 50 }),
        chaserApi.list(undefined, 1, 50),
        timeEntryApi.list({ per_page: 50 }),
        portalApi.listLinks(),
      ]);

      const allResults: SearchResult[] = [...navResults];

      // Invoices
      if (invoicesRes.status === "fulfilled") {
        (invoicesRes.value.data || [])
          .filter(
            (inv: Invoice) =>
              inv.number.toLowerCase().includes(q) ||
              inv.client_name.toLowerCase().includes(q) ||
              (inv.client_email &&
                inv.client_email.toLowerCase().includes(q)) ||
              (inv.notes && inv.notes.toLowerCase().includes(q)),
          )
          .slice(0, 5)
          .forEach((inv: Invoice) => {
            allResults.push({
              id: inv.id,
              type: "invoice",
              title: inv.number,
              subtitle: inv.client_name,
              meta: formatCurrency(inv.total, inv.currency),
              status: inv.status,
              href: `/invoices/${inv.id}`,
            });
          });
      }

      // Clients
      if (clientsRes.status === "fulfilled") {
        (clientsRes.value.data || [])
          .filter(
            (c: Client) =>
              c.name.toLowerCase().includes(q) ||
              c.email.toLowerCase().includes(q) ||
              (c.company && c.company.toLowerCase().includes(q)) ||
              (c.phone && c.phone.toLowerCase().includes(q)),
          )
          .slice(0, 5)
          .forEach((c: Client) => {
            allResults.push({
              id: c.id,
              type: "client",
              title: c.name,
              subtitle: c.email,
              meta: c.company || c.city || "",
              href: `/clients/${c.id}`,
            });
          });
      }

      // Payment Links
      if (paymentsRes.status === "fulfilled") {
        (paymentsRes.value.data || [])
          .filter(
            (p: PaymentLink) =>
              p.title.toLowerCase().includes(q) ||
              (p.description && p.description.toLowerCase().includes(q)),
          )
          .slice(0, 5)
          .forEach((p: PaymentLink) => {
            allResults.push({
              id: p.id,
              type: "payment",
              title: p.title,
              subtitle: formatCurrency(p.amount, p.currency),
              status: p.status,
              meta: p.description || "",
              href: `/payments/${p.id}`,
            });
          });
      }

      // Quotations
      if (quotationsRes.status === "fulfilled") {
        (quotationsRes.value.data || [])
          .filter(
            (qt: Quotation) =>
              qt.quotation_number.toLowerCase().includes(q) ||
              qt.client_name.toLowerCase().includes(q) ||
              (qt.client_email && qt.client_email.toLowerCase().includes(q)) ||
              (qt.notes && qt.notes.toLowerCase().includes(q)),
          )
          .slice(0, 5)
          .forEach((qt: Quotation) => {
            allResults.push({
              id: qt.id,
              type: "quotation",
              title: qt.quotation_number,
              subtitle: qt.client_name,
              meta: formatCurrency(qt.total, qt.currency),
              status: qt.status,
              href: `/quotations/${qt.id}`,
            });
          });
      }

      // Tasks
      if (tasksRes.status === "fulfilled") {
        (tasksRes.value.data || [])
          .filter(
            (task: Task) =>
              task.title.toLowerCase().includes(q) ||
              (task.description &&
                task.description.toLowerCase().includes(q)) ||
              (task.client_name &&
                task.client_name.toLowerCase().includes(q)) ||
              (task.project_name &&
                task.project_name.toLowerCase().includes(q)) ||
              (task.tags &&
                task.tags.some((tag) => tag.toLowerCase().includes(q))),
          )
          .slice(0, 5)
          .forEach((task: Task) => {
            allResults.push({
              id: task.id,
              type: "task",
              title: task.title,
              subtitle:
                [task.project_name, task.client_name]
                  .filter(Boolean)
                  .join(" · ") ||
                t("search.noProject"),
              status: task.status,
              meta: task.priority,
              href: `/tasks?highlight=${task.id}`,
            });
          });
      }

      // Projects
      if (projectsRes.status === "fulfilled") {
        (projectsRes.value.data || [])
          .filter(
            (p: Project) =>
              p.name.toLowerCase().includes(q) ||
              (p.description && p.description.toLowerCase().includes(q)) ||
              (p.client_name && p.client_name.toLowerCase().includes(q)),
          )
          .slice(0, 5)
          .forEach((p: Project) => {
            allResults.push({
              id: p.id,
              type: "project",
              title: p.name,
              subtitle: p.client_name || t("search.noClient"),
              status: p.status,
              meta: p.budget ? formatCurrency(p.budget, p.currency) : "",
              href: `/projects/${p.id}`,
            });
          });
      }

      // Meetings
      if (meetingsRes.status === "fulfilled") {
        (meetingsRes.value.data || [])
          .filter(
            (m: Meeting) =>
              m.title.toLowerCase().includes(q) ||
              (m.client_name && m.client_name.toLowerCase().includes(q)) ||
              (m.project_name && m.project_name.toLowerCase().includes(q)) ||
              (m.agenda && m.agenda.toLowerCase().includes(q)) ||
              (m.notes && m.notes.toLowerCase().includes(q)) ||
              (m.summary && m.summary.toLowerCase().includes(q)) ||
              (m.action_items &&
                m.action_items.some((item) => item.toLowerCase().includes(q))),
          )
          .slice(0, 5)
          .forEach((m: Meeting) => {
            allResults.push({
              id: m.id,
              type: "meeting",
              title: m.title,
              subtitle:
                [m.client_name, m.project_name].filter(Boolean).join(" · ") ||
                t("search.meeting"),
              status: m.status,
              meta: m.scheduled_at ? formatDate(m.scheduled_at) : "",
              href: "/meetings",
            });
          });
      }

      // Payment Chasers
      if (chasersRes.status === "fulfilled") {
        (chasersRes.value.data || [])
          .filter(
            (ch: PaymentChaser) =>
              ch.invoice_number.toLowerCase().includes(q) ||
              ch.client_name.toLowerCase().includes(q) ||
              (ch.client_email && ch.client_email.toLowerCase().includes(q)),
          )
          .slice(0, 5)
          .forEach((ch: PaymentChaser) => {
            allResults.push({
              id: ch.id,
              type: "chaser",
              title: ch.invoice_number,
              subtitle: ch.client_name,
              meta: formatCurrency(ch.amount_due, ch.currency),
              status: ch.status,
              href: "/chasers",
            });
          });
      }

      // Time Entries
      if (timeRes.status === "fulfilled") {
        (timeRes.value.data || [])
          .filter(
            (te: TimeEntry) =>
              te.task_title.toLowerCase().includes(q) ||
              (te.project_name && te.project_name.toLowerCase().includes(q)) ||
              (te.notes && te.notes.toLowerCase().includes(q)),
          )
          .slice(0, 5)
          .forEach((te: TimeEntry) => {
            const hrs = Math.floor(te.duration_seconds / 3600);
            const mins = Math.floor((te.duration_seconds % 3600) / 60);
            allResults.push({
              id: te.id,
              type: "timeentry",
              title: te.task_title,
              subtitle: te.project_name || te.date,
              meta: `${t("search.hoursShort", { count: hrs })} ${t(
                "search.minutesShort",
                { count: mins },
              )}`,
              href: "/time-tracking",
            });
          });
      }

      // Portal Tokens
      if (portalRes.status === "fulfilled") {
        (portalRes.value.data || [])
          .filter(
            (pt: PortalToken) =>
              pt.client_name.toLowerCase().includes(q) ||
              pt.client_email.toLowerCase().includes(q),
          )
          .slice(0, 5)
          .forEach((pt: PortalToken) => {
            allResults.push({
              id: pt.id,
              type: "portal",
              title: pt.client_name,
              subtitle: pt.client_email,
              status: pt.is_active ? "active" : "inactive",
              href: "/portal",
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
    },
    [localizedQuickNavPages, t],
  );

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
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      navigateTo(results[activeIndex]);
    }
  };

  const navigateTo = (result: SearchResult) => {
    setIsOpen(false);
    if (onCloseMobile) onCloseMobile();
    else setMobileOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.href);
  };

  // ── Group results by type ────────────────────────────

  const groupedResults = results.reduce<Record<string, SearchResult[]>>(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    },
    {},
  );

  // ── Dropdown positioning ─────────────────────────────

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 780),
        zIndex: 9999,
      });
    }
  }, [isOpen, query]);

  // Flat index counter for keyboard nav
  let flatIndex = -1;

  // ── Shared results renderer ──────────────────────────
  const renderResults = (isMobile = false) => {
    let localFlatIndex = -1;
    return (
      <>
        {loading && !results.length ? (
          <div className="flex items-center justify-center gap-2 py-8 text-text-secondary text-sm">
            <Loading03Icon width={18} height={18} className="animate-spin" />
            {t("search.searchingAll")}
          </div>
        ) : results.length > 0 ? (
          <div className={isMobile ? "flex-1 overflow-y-auto" : "max-h-[420px] overflow-y-auto"}>
            {TYPE_ORDER.map((type) => {
              const items = groupedResults[type];
              if (!items || items.length === 0) return null;
              const meta = TYPE_META[type];
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary/70 border-b border-border-light sticky top-0 z-10">
                    <span className={`flex items-center justify-center w-5 h-5 rounded ${meta.color}`}>
                      {meta.icon}
                    </span>
                    <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                      {t(meta.labelKey)}
                    </span>
                    <span className="text-[10px] text-text-tertiary bg-bg-secondary border border-border-color rounded-full px-1.5 py-0 font-semibold">
                      {items.length}
                    </span>
                  </div>
                  {items.map((item) => {
                    localFlatIndex++;
                    const idx = localFlatIndex;
                    return (
                      <button
                        key={item.id}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-100 border-b border-border-light/50 last:border-b-0 group ${
                          activeIndex === idx
                            ? "bg-red-50 dark:bg-red-900/20"
                            : "hover:bg-bg-hover"
                        }`}
                        onClick={() => {
                          if (isMobile) setMobileOpen(false);
                          navigateTo(item);
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TYPE_META[item.type].color}`}>
                          {TYPE_META[item.type].icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text-primary truncate">
                              {item.title}
                            </span>
                            {item.status && (
                              <span className={`badge text-[10px] py-0 px-1.5 ${getStatusColor(item.status)}`}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-tertiary truncate">
                            {item.subtitle}
                          </div>
                        </div>
                        {item.meta && (
                          <span className="text-xs font-semibold text-text-secondary shrink-0">
                            {item.meta}
                          </span>
                        )}
                        <ArrowRight01Icon
                          width={14}
                          height={14}
                          className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        />
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
            <p className="text-sm text-text-secondary">
              <strong>{t("search.noResultsFor", { query })}</strong>
            </p>
            <p className="text-xs text-text-tertiary">{t("search.tryAnother")}</p>
          </div>
        ) : null}

        {results.length > 0 && !isMobile && (
          <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary/50 border-t border-border-light text-[11px] text-text-tertiary">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="bg-bg-primary border border-border-color rounded px-1 py-0 text-[10px]">↑↓</kbd>{" "}
                {t("search.navigate")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-bg-primary border border-border-color rounded px-1 py-0 text-[10px]">↵</kbd>{" "}
                {t("search.open")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-bg-primary border border-border-color rounded px-1 py-0 text-[10px]">Esc</kbd>{" "}
                {t("search.close")}
              </span>
            </div>
            <span>{t("search.resultCount", { count: results.length })}</span>
          </div>
        )}
        {results.length > 0 && isMobile && (
          <div className="flex items-center justify-center px-4 py-2.5 bg-bg-secondary/50 border-t border-border-light text-[11px] text-text-tertiary">
            <span>{t("search.resultCount", { count: results.length })}</span>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* ── Desktop search bar ─────────────────────────── */}
      <div
        ref={containerRef}
        className="relative flex items-center w-full max-w-[400px] max-lg:hidden"
      >
        <div className="relative w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none flex items-center justify-center">
            <Search02Icon
              className="dark:text-white text-black"
              width={18}
              height={18}
            />
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder={t("search.placeholder")}
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
          {query ? (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
              onClick={() => {
                setQuery("");
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



      {/* ── Desktop dropdown via Portal ────────────────── */}
      {isOpen && (
        <Portal>
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-bg-card border border-border-color rounded-xl shadow-2xl overflow-hidden animate-fade-in"
          >
            {renderResults(false)}
          </div>
        </Portal>
      )}

      {/* ── Mobile full-screen overlay ─────────────────── */}
      {isMobileOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] bg-bg-primary flex flex-col animate-fade-in lg:hidden">
            {/* Mobile search header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-color bg-bg-card">
              <span className="opacity-50 flex items-center">
                <Search02Icon width={20} height={20} className="text-text-primary" />
              </span>
              <input
                ref={mobileInputRef}
                type="text"
                placeholder={t("search.placeholder")}
                className="flex-1 py-2 bg-transparent text-text-primary text-[15px] outline-none placeholder:text-text-tertiary"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value) {
                    setLoading(true);
                  }
                }}
                onKeyDown={handleKeyDown}
              />
              <button
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-bg-secondary border border-border-color text-text-tertiary hover:text-text-primary transition-colors"
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                  else setMobileOpen(false);
                  setQuery("");
                  setResults([]);
                }}
              >
                <Cancel01Icon width={18} height={18} />
              </button>
            </div>
            {/* Mobile results */}
            <div className="flex-1 overflow-y-auto">
              {renderResults(true)}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
