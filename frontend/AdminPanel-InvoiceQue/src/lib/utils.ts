import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export function formatCurrency(amount: number, currency = 'IDR'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: id });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm', { locale: id });
  } catch {
    return dateStr;
  }
}

export function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: id });
  } catch {
    return dateStr;
  }
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    sent: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    overdue: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    cancelled: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    expired: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    failed: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  return map[status?.toLowerCase()] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}
