import type {
  PremiumFeature,
  SubscriptionResource,
  UsageData,
} from "@/lib/api";

// ── Resource copy (existing) ──────────────────────────────────

export const resourceCopy: Record<
  SubscriptionResource,
  { label: string; action: string; path: string }
> = {
  invoices: {
    label: "Invoice",
    action: "Buat Invoice",
    path: "/invoices/create",
  },
  clients: {
    label: "Klien",
    action: "Tambah Klien",
    path: "/clients/create",
  },
  payment_links: {
    label: "Payment Link",
    action: "Buat Payment Link",
    path: "/payments/create",
  },
};

// ── Feature metadata ──────────────────────────────────────────

export const PREMIUM_FEATURES: Record<
  PremiumFeature,
  { label: string; description: string; minPlan: string }
> = {
  crm: {
    label: "CRM",
    description: "Kelola hubungan klien secara profesional",
    minPlan: "Pro",
  },
  reports: {
    label: "Reports",
    description: "Laporan keuangan & analitik lengkap",
    minPlan: "Pro",
  },
  meetings: {
    label: "Meetings",
    description: "Jadwalkan dan kelola meeting klien",
    minPlan: "Pro",
  },
  time_tracking: {
    label: "Time Tracking",
    description: "Lacak waktu kerja per project/task",
    minPlan: "Pro",
  },
  chasers: {
    label: "Invoice Chasers",
    description: "Pengingat otomatis untuk invoice tertunggak",
    minPlan: "Pro",
  },
  calendar: {
    label: "Calendar",
    description: "Kalender proyek dan deadline terpusat",
    minPlan: "Pro",
  },
  custom_branding: {
    label: "Custom Branding",
    description: "Logo & warna brand di invoice Anda",
    minPlan: "Pro",
  },
  xendit_integration: {
    label: "Xendit Integration",
    description: "Terima pembayaran via Xendit",
    minPlan: "Pro",
  },
  paypal_integration: {
    label: "PayPal Integration",
    description: "Terima pembayaran via PayPal",
    minPlan: "Pro",
  },
  toolkit_contracts: {
    label: "Contracts",
    description: "Template kontrak profesional",
    minPlan: "Pro",
  },
  toolkit_rate_cards: {
    label: "Rate Cards",
    description: "Kartu tarif layanan Anda",
    minPlan: "Pro",
  },
  toolkit_brand_kits: {
    label: "Brand Kits",
    description: "Kit branding visual lengkap",
    minPlan: "Pro",
  },
  toolkit_briefs: {
    label: "Briefs",
    description: "Brief proyek terstruktur",
    minPlan: "Pro",
  },
  toolkit_campaigns: {
    label: "Campaigns",
    description: "Pengelolaan campaign marketing",
    minPlan: "Pro",
  },
  toolkit_intake_forms: {
    label: "Intake Forms",
    description: "Formulir onboarding klien baru",
    minPlan: "Pro",
  },
  toolkit_palettes: {
    label: "Palettes",
    description: "Generator palet warna desain",
    minPlan: "Pro",
  },
};

// ── Feature gating ────────────────────────────────────────────

/**
 * Check if a premium feature is unlocked for the current user.
 *
 * Strategy:
 * 1. If the backend returns `unlocked_features`, use it directly.
 * 2. Fallback: derive access from `plan_id` (free = basic only, pro/enterprise = all).
 */
export function isFeatureUnlocked(
  usage: UsageData | null | undefined,
  feature: PremiumFeature,
): boolean {
  if (!usage) return false;

  // If backend provides unlocked_features, use it
  if (usage.unlocked_features?.length) {
    return usage.unlocked_features.includes(feature);
  }

  // Fallback: derive from plan_id
  const planId = usage.plan_id || "plan_free";
  if (planId === "plan_free") return false;
  // Pro & Enterprise unlock all features
  return true;
}

/**
 * Check if the current plan is free tier.
 */
export function isFreePlan(usage: UsageData | null | undefined): boolean {
  if (!usage) return true;
  return !usage.plan_id || usage.plan_id === "plan_free";
}

/**
 * Check if the current plan is Pro or higher.
 */
export function isPremiumPlan(usage: UsageData | null | undefined): boolean {
  return !isFreePlan(usage);
}

// ── Resource usage helpers (existing, preserved) ──────────────

export function getResourceUsage(
  usage: UsageData | null | undefined,
  resource: SubscriptionResource,
) {
  if (!usage) {
    return { used: 0, limit: 0, canCreate: true };
  }

  switch (resource) {
    case "invoices":
      return {
        used: usage.invoices_used ?? 0,
        limit: usage.invoices_limit ?? 5,
        canCreate: usage.can_create_invoice ?? true,
      };
    case "clients":
      return {
        used: usage.clients_used ?? 0,
        limit: usage.clients_limit ?? 10,
        canCreate: usage.can_create_client ?? true,
      };
    case "payment_links":
      return {
        used: usage.payment_links_used ?? 0,
        limit: usage.payment_links_limit ?? 5,
        canCreate: usage.can_create_payment ?? true,
      };
  }
}

export function isResourceLocked(
  usage: UsageData | null | undefined,
  resource: SubscriptionResource,
) {
  const { used, limit, canCreate } = getResourceUsage(usage, resource);
  if (limit === -1) return false;
  return !canCreate || used >= limit;
}

export function getLockedResources(
  usage: UsageData | null | undefined,
): SubscriptionResource[] {
  if (!usage) return [];

  if (usage.locked_resources?.length) {
    return usage.locked_resources;
  }

  return (
    ["invoices", "clients", "payment_links"] as SubscriptionResource[]
  ).filter((resource) => isResourceLocked(usage, resource));
}

export function formatLimit(limit: number) {
  return limit === -1 ? "Unlimited" : String(limit);
}

export function getLimitReachedMessage(
  usage: UsageData | null | undefined,
  resource: SubscriptionResource,
) {
  const copy = resourceCopy[resource];
  const { used, limit } = getResourceUsage(usage, resource);

  return `Limit ${copy.label.toLowerCase()} plan Anda sudah tercapai (${used}/${formatLimit(limit)}). Upgrade plan untuk membuka fitur ini kembali.`;
}

export function getPlanDisplayName(usage: UsageData | null | undefined) {
  return usage?.plan_display_name || usage?.plan_name || "Free";
}
