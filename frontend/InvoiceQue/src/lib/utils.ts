export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  const cur = currency.toUpperCase();
  const locale = cur === 'IDR' ? 'id-ID' : cur === 'USD' ? 'en-US' : cur === 'EUR' ? 'de-DE' : cur === 'GBP' ? 'en-GB' : cur === 'JPY' ? 'ja-JP' : 'en-US';
  const noDecimals = ['IDR', 'JPY', 'KRW', 'VND'];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: noDecimals.includes(cur) ? 0 : 2,
    maximumFractionDigits: noDecimals.includes(cur) ? 0 : 2,
  }).format(amount);
}

// Approximate fallback exchange rates to IDR (used when API is unavailable)
const FALLBACK_RATES_TO_IDR: Record<string, number> = {
  IDR: 1,
  USD: 16_200,
  EUR: 18_400,
  GBP: 20_800,
  SGD: 12_300,
  MYR: 3_700,
  JPY: 108,
  AUD: 10_500,
  KRW: 12,
  VND: 0.65,
};

// Cache for live rates
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/** Fetch live exchange rates to IDR from free API. Cached for 1 hour. */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < CACHE_DURATION) {
    return cachedRates;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/IDR');
    const data = await res.json();
    if (data.result === 'success' && data.rates) {
      // data.rates gives: 1 IDR = X <currency>
      // We need: 1 <currency> = ? IDR  →  1 / X
      const rates: Record<string, number> = { IDR: 1 };
      for (const [cur, val] of Object.entries(data.rates)) {
        if (typeof val === 'number' && val > 0) {
          rates[cur] = Math.round((1 / val) * 100) / 100;
        }
      }
      cachedRates = rates;
      cacheTimestamp = now;
      return rates;
    }
  } catch {
    // Fall through to fallback
  }
  return FALLBACK_RATES_TO_IDR;
}

/** Convert an amount from any supported currency to IDR (sync, uses locked rate, cached or fallback rates) */
export function convertToIDR(amount: number, currency: string = 'IDR', liveRates?: Record<string, number>, lockedRate?: number): number {
  if (lockedRate && lockedRate > 0) {
    return Math.round(amount * lockedRate);
  }
  const rates = liveRates || cachedRates || FALLBACK_RATES_TO_IDR;
  const rate = rates[currency.toUpperCase()] ?? 1;
  return Math.round(amount * rate);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateFull(date: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'completed':
    case 'success':
    case 'active':
      return 'badge-success';
    case 'pending':
    case 'sent':
    case 'partially_paid':
      return 'badge-warning';
    case 'overdue':
    case 'failed':
    case 'cancelled':
    case 'expired':
      return 'badge-danger';
    case 'draft':
      return 'badge-default';
    default:
      return 'badge-info';
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
}
