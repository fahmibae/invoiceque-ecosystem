import type { SubscriptionResource, UsageData } from '@/lib/api';

export const resourceCopy: Record<SubscriptionResource, { label: string; action: string; path: string }> = {
  invoices: {
    label: 'Invoice',
    action: 'Buat Invoice',
    path: '/invoices/create',
  },
  clients: {
    label: 'Klien',
    action: 'Tambah Klien',
    path: '/clients/create',
  },
  payment_links: {
    label: 'Payment Link',
    action: 'Buat Payment Link',
    path: '/payments/create',
  },
};

export function getResourceUsage(usage: UsageData | null | undefined, resource: SubscriptionResource) {
  if (!usage) {
    return { used: 0, limit: 0, canCreate: true };
  }

  switch (resource) {
    case 'invoices':
      return {
        used: usage.invoices_used ?? 0,
        limit: usage.invoices_limit ?? 5,
        canCreate: usage.can_create_invoice ?? true,
      };
    case 'clients':
      return {
        used: usage.clients_used ?? 0,
        limit: usage.clients_limit ?? 10,
        canCreate: usage.can_create_client ?? true,
      };
    case 'payment_links':
      return {
        used: usage.payment_links_used ?? 0,
        limit: usage.payment_links_limit ?? 5,
        canCreate: usage.can_create_payment ?? true,
      };
  }
}

export function isResourceLocked(usage: UsageData | null | undefined, resource: SubscriptionResource) {
  const { used, limit, canCreate } = getResourceUsage(usage, resource);
  if (limit === -1) return false;
  return !canCreate || used >= limit;
}

export function getLockedResources(usage: UsageData | null | undefined): SubscriptionResource[] {
  if (!usage) return [];

  if (usage.locked_resources?.length) {
    return usage.locked_resources;
  }

  return (['invoices', 'clients', 'payment_links'] as SubscriptionResource[])
    .filter((resource) => isResourceLocked(usage, resource));
}

export function formatLimit(limit: number) {
  return limit === -1 ? 'Unlimited' : String(limit);
}

export function getLimitReachedMessage(usage: UsageData | null | undefined, resource: SubscriptionResource) {
  const copy = resourceCopy[resource];
  const { used, limit } = getResourceUsage(usage, resource);

  return `Limit ${copy.label.toLowerCase()} plan Anda sudah tercapai (${used}/${formatLimit(limit)}). Upgrade plan untuk membuka fitur ini kembali.`;
}

export function getPlanDisplayName(usage: UsageData | null | undefined) {
  return usage?.plan_display_name || usage?.plan_name || 'Free';
}
