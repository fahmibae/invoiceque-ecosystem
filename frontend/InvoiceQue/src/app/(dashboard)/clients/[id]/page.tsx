'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { clientApi, invoiceApi, type Client, type Invoice } from '@/lib/api';
import { formatCurrency, getStatusColor, convertToIDR, fetchExchangeRates } from '@/lib/utils';
import { User02Icon, Mail01Icon, SmartPhone01Icon, ArrowLeft02Icon, Edit02Icon, Delete02Icon, Location01Icon, Calendar01Icon, File01Icon, CheckmarkCircle01Icon, MoneyBag02Icon } from 'hugeicons-react';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);

  // Compute real totals from invoices instead of stale DB fields
  const computedStats = React.useMemo(() => {
    const totalInvoices = invoices.length;
    const totalSpent = invoices
      .filter(inv => inv.status === 'paid' || inv.status === 'partially_paid')
      .reduce((sum, inv) => sum + convertToIDR(inv.amount_paid || 0, inv.currency, exchangeRates ?? undefined, inv.exchange_rate_idr), 0);
    const pendingAmount = invoices
      .filter(inv => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'partially_paid')
      .reduce((sum, inv) => sum + convertToIDR(inv.amount_remaining || 0, inv.currency, exchangeRates ?? undefined, inv.exchange_rate_idr), 0);
    return { totalInvoices, totalSpent, pendingAmount };
  }, [invoices, exchangeRates]);

  useEffect(() => {
    async function fetchData() {
      try {
        if (!params.id) return;
        const [clientRes, invoicesRes] = await Promise.all([
          clientApi.get(params.id as string),
          invoiceApi.list(undefined, 0, 100), // Fetch up to 100 invoices to filter locally
        ]);
        setClient(clientRes);
        // Filter invoices for this client
        setInvoices(invoicesRes.data.filter(inv => inv.client_id === params.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat detail klien');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    fetchExchangeRates().then(setExchangeRates);
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus klien ini beserta seluruh datanya?')) return;
    try {
      await clientApi.delete(params.id as string);
      router.push('/clients');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus klien');
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat detail klien...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="animate-fade-in p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-500 mb-4">{error || 'Klien tidak ditemukan'}</p>
        <Link href="/clients" className="btn btn-primary flex items-center gap-2"><ArrowLeft02Icon/> Kembali</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link href="/clients" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"><ArrowLeft02Icon/></Link>
            <h1 className="page-title">
              Detail Klien
            </h1>
          </div>
          <p className="page-subtitle">Informasi lengkap dan riwayat transaksi {client.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/clients/${params.id}/edit`} className="btn btn-primary flex items-center gap-2"><Edit02Icon/> Edit Klien</Link>
          <button onClick={handleDelete} className="btn btn-danger flex items-center gap-2"><Delete02Icon/> Hapus Klien</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Client Profile Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="card relative overflow-hidden before:absolute before:top-0 before:inset-x-0 before:h-[4px] before:bg-gradient-to-r before:from-red-600 before:to-red-400">
            <div className="flex flex-col items-center text-center mb-6 pt-4">
              <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-red-400 rounded-full flex items-center justify-center font-bold text-3xl text-white shadow-lg shadow-red-500/20 mb-4">
                {client.name.split(' ').map((n) => n[0]).join('').substring(0,2)}
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-1">{client.name}</h2>
              <p className="text-sm font-medium text-red-600">{client.company}</p>
            </div>

            <div className="flex flex-col gap-4 border-t border-border-light pt-6">
              <div className="flex items-start gap-3 text-sm">
                <Mail01Icon className="text-text-tertiary shrink-0" width={18} height={18} />
                <div className="overflow-hidden">
                  <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">Email</div>
                  <div className="text-text-secondary truncate">{client.email}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <SmartPhone01Icon className="text-text-tertiary shrink-0" width={18} height={18} />
                <div>
                  <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">Telepon</div>
                  <div className="text-text-secondary">{client.phone || '-'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Location01Icon className="text-text-tertiary shrink-0" width={18} height={18} />
                <div>
                  <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">Alamat</div>
                  <div className="text-text-secondary leading-relaxed">
                    {client.address || '-'}
                    {client.city && <><br/>{client.city}</>}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Calendar01Icon className="text-text-tertiary shrink-0" width={18} height={18} />
                <div>
                  <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">Bergabung Sejak</div>
                  <div className="text-text-secondary">{new Date(client.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats & Invoices */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card bg-gradient-to-br from-bg-card to-red-50/30 dark:to-red-900/10 flex items-center p-6">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center shrink-0 mr-4">
                <File01Icon width={28} height={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Total Invoice</p>
                <h3 className="text-3xl font-bold text-text-primary">{computedStats.totalInvoices}</h3>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-bg-card to-green-50/30 dark:to-green-900/10 flex items-center p-6">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center shrink-0 mr-4">
                <CheckmarkCircle01Icon width={28} height={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Total Dibayar</p>
                <h3 className="text-2xl font-bold text-text-primary">{formatCurrency(computedStats.totalSpent)}</h3>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-bg-card to-amber-50/30 dark:to-amber-900/10 flex items-center p-6">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center shrink-0 mr-4">
                <MoneyBag02Icon width={28} height={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Belum Dibayar</p>
                <h3 className="text-2xl font-bold text-text-primary">{formatCurrency(computedStats.pendingAmount)}</h3>
              </div>
            </div>
          </div>

          <div className="card flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Riwayat Invoice</h3>
              <Link href={`/invoices/create`} className="btn btn-primary btn-sm">Buat Invoice Baru</Link>
            </div>

            {invoices.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nomor</th>
                      <th>Tanggal</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <span className="font-semibold text-text-primary">{inv.number}</span>
                        </td>
                        <td>{new Date(inv.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="font-medium text-text-primary">{formatCurrency(inv.total, inv.currency)}</td>
                        <td>
                          <span className={`badge ${getStatusColor(inv.status)}`}>
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <Link href={`/invoices/${inv.id}`} className="table-link">Lihat</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 px-4 border border-dashed border-border-color rounded-lg bg-bg-tertiary/50">
                <div className="text-4xl mb-3 opacity-30 flex justify-center"><File01Icon width={48} height={48} /></div>
                <p className="text-text-secondary font-medium">Belum ada invoice untuk klien ini</p>
                <p className="text-sm text-text-tertiary mt-1 mb-4">Buat invoice pertama untuk mulai menagih klien ini.</p>
                <Link href={`/invoices/create`} className="btn btn-secondary btn-sm">Buat Invoice</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
