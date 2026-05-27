import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Invoice, Client, PaymentLink } from './api';
import { formatCurrency, convertToIDR } from './utils';

// ── Types ─────────────────────────────────────────────

export interface ReportData {
  invoices: Invoice[];
  clients: Client[];
  paymentLinks: PaymentLink[];
  rates: Record<string, number> | null;
  period: string;
  kpis: {
    totalRevenue: number;
    totalPending: number;
    totalOverdue: number;
    avgInvoice: number;
    collectionRate: number;
    paidCount: number;
    sentCount: number;
    overdueCount: number;
    draftCount: number;
    dpCount: number;
  };
  topClients: { name: string; revenue: number; count: number }[];
  agingBuckets: { current: number; '1-30': number; '31-60': number; '61-90': number; '90+': number };
  monthlyRevenue: { month: string; revenue: number }[];
}

// ── Excel Export ──────────────────────────────────────

function fmtCur(amount: number, currency = 'IDR') {
  return formatCurrency(amount, currency);
}

export function exportReportToExcel(data: ReportData) {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;

  // ── Sheet 1: Ringkasan / Summary ──
  const summaryRows = [
    ['LAPORAN KEUANGAN INVOICEQU'],
    [`Periode: ${data.period}`],
    [`Tanggal Export: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
    [],
    ['RINGKASAN KPI'],
    ['Metrik', 'Nilai'],
    ['Total Pendapatan', fmtCur(data.kpis.totalRevenue)],
    ['Belum Dibayar', fmtCur(data.kpis.totalPending)],
    ['Jatuh Tempo', fmtCur(data.kpis.totalOverdue)],
    ['Rata-rata Invoice', fmtCur(data.kpis.avgInvoice)],
    ['Tingkat Koleksi', `${data.kpis.collectionRate}%`],
    [],
    ['DISTRIBUSI STATUS'],
    ['Status', 'Jumlah'],
    ['Lunas', data.kpis.paidCount],
    ['Terkirim', data.kpis.sentCount],
    ['Jatuh Tempo', data.kpis.overdueCount],
    ['Draft', data.kpis.draftCount],
    ['DP (Partially Paid)', data.kpis.dpCount],
    [],
    ['AGING PIUTANG'],
    ['Kategori', 'Jumlah (IDR)'],
    ['Belum Jatuh Tempo', fmtCur(data.agingBuckets.current)],
    ['1-30 Hari Lewat', fmtCur(data.agingBuckets['1-30'])],
    ['31-60 Hari Lewat', fmtCur(data.agingBuckets['31-60'])],
    ['61-90 Hari Lewat', fmtCur(data.agingBuckets['61-90'])],
    ['> 90 Hari Lewat', fmtCur(data.agingBuckets['90+'])],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  // ── Sheet 2: Tren Pendapatan ──
  const revenueRows = [
    ['TREN PENDAPATAN BULANAN'],
    [],
    ['Bulan', 'Pendapatan (IDR)'],
    ...data.monthlyRevenue.map(r => [r.month, fmtCur(r.revenue)]),
  ];
  const wsRevenue = XLSX.utils.aoa_to_sheet(revenueRows);
  wsRevenue['!cols'] = [{ wch: 18 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsRevenue, 'Tren Pendapatan');

  // ── Sheet 3: Top Klien ──
  const clientRows = [
    ['KLIEN TERATAS'],
    [],
    ['Peringkat', 'Nama Klien', 'Jumlah Invoice', 'Total Pendapatan (IDR)'],
    ...data.topClients.map((c, i) => [i + 1, c.name, c.count, fmtCur(c.revenue)]),
  ];
  const wsClients = XLSX.utils.aoa_to_sheet(clientRows);
  wsClients['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 18 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsClients, 'Klien Teratas');

  // ── Sheet 4: Detail Invoice ──
  const invoiceHeaders = ['No.', 'Nomor Invoice', 'Klien', 'Status', 'Mata Uang', 'Total', 'Total (IDR)', 'Dibayar', 'Sisa', 'Jatuh Tempo', 'Dibuat'];
  const invoiceRows = data.invoices.map((inv, i) => [
    i + 1,
    inv.number || inv.invoice_number || '',
    inv.client_name,
    inv.status,
    inv.currency || 'IDR',
    inv.total,
    convertToIDR(inv.total, inv.currency, data.rates || undefined, inv.exchange_rate_idr),
    inv.amount_paid || 0,
    inv.amount_remaining || 0,
    inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '',
    inv.created_at ? new Date(inv.created_at).toLocaleDateString('id-ID') : '',
  ]);
  const wsInvoices = XLSX.utils.aoa_to_sheet([
    ['DETAIL SEMUA INVOICE'],
    [],
    invoiceHeaders,
    ...invoiceRows,
  ]);
  wsInvoices['!cols'] = [
    { wch: 5 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInvoices, 'Detail Invoice');

  // ── Sheet 5: Payment Links ──
  const plHeaders = ['No.', 'Judul', 'Jumlah', 'Mata Uang', 'Status', 'Klik', 'Pembayaran', 'Dibuat'];
  const plRows = data.paymentLinks.map((pl, i) => [
    i + 1,
    pl.title,
    pl.amount,
    pl.currency || 'IDR',
    pl.status,
    pl.clicks || 0,
    pl.payments || 0,
    pl.created_at ? new Date(pl.created_at).toLocaleDateString('id-ID') : '',
  ]);
  const wsPL = XLSX.utils.aoa_to_sheet([
    ['DETAIL PAYMENT LINKS'],
    [],
    plHeaders,
    ...plRows,
  ]);
  wsPL['!cols'] = [
    { wch: 5 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
    { wch: 8 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPL, 'Payment Links');

  // ── Write & Save ──
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Laporan_InvoiceQu_${dateStr}.xlsx`);
}

// ── PDF Print ─────────────────────────────────────────

export function printReportPDF(data: ReportData) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusMap: Record<string, string> = {
    paid: 'Lunas',
    sent: 'Terkirim',
    overdue: 'Jatuh Tempo',
    draft: 'Draft',
    partially_paid: 'DP',
  };

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan InvoiceQu — ${dateStr}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sora', -apple-system, sans-serif;
      color: #1a1a2e; background: #fff;
      font-size: 11px; line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page { size: A4; margin: 12mm 14mm; }

    .report-wrapper { max-width: 780px; margin: 0 auto; padding: 20px 0; }

    /* Header */
    .report-header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 3px solid #DC2626; padding-bottom: 16px; margin-bottom: 24px;
    }
    .report-header h1 { font-size: 22px; font-weight: 800; color: #DC2626; }
    .report-header .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .report-header .meta { text-align: right; font-size: 10px; color: #6b7280; }
    .report-header .meta strong { color: #1a1a2e; }

    /* Section */
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title {
      font-size: 13px; font-weight: 700; color: #DC2626;
      border-bottom: 1.5px solid #fecaca; padding-bottom: 6px; margin-bottom: 12px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .kpi-card {
      border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;
      text-align: center; background: #fafafa;
    }
    .kpi-card .label { font-size: 9px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .kpi-card .value { font-size: 15px; font-weight: 800; color: #1a1a2e; margin-top: 4px; }
    .kpi-card .value.green { color: #059669; }
    .kpi-card .value.red { color: #DC2626; }
    .kpi-card .value.blue { color: #2563eb; }
    .kpi-card .value.purple { color: #7c3aed; }

    /* Status bar */
    .status-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .status-card { text-align: center; padding: 8px; border-radius: 6px; background: #f9fafb; border: 1px solid #e5e7eb; }
    .status-card .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; vertical-align: middle; }
    .status-card .count { font-size: 18px; font-weight: 800; }
    .status-card .label { font-size: 9px; color: #6b7280; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th {
      background: #fef2f2; color: #991b1b; font-weight: 700; font-size: 9px;
      text-transform: uppercase; letter-spacing: 0.4px;
      padding: 8px 10px; text-align: left; border-bottom: 2px solid #fecaca;
    }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    tr:nth-child(even) td { background: #fafafa; }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }

    /* Status badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 9px; font-weight: 600; }
    .badge-paid { background: #d1fae5; color: #065f46; }
    .badge-sent { background: #dbeafe; color: #1e40af; }
    .badge-overdue { background: #fee2e2; color: #991b1b; }
    .badge-draft { background: #f3f4f6; color: #4b5563; }
    .badge-dp { background: #fef3c7; color: #92400e; }

    /* Revenue chart (simple bars) */
    .bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 100px; padding: 0 4px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; }
    .bar { width: 100%; max-width: 40px; background: linear-gradient(to top, #DC2626, #f87171); border-radius: 3px 3px 0 0; min-height: 3px; }
    .bar-label { font-size: 8px; color: #6b7280; margin-top: 4px; text-align: center; }
    .bar-value { font-size: 8px; font-weight: 600; color: #374151; margin-bottom: 2px; }

    /* Aging bars */
    .aging-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .aging-label { width: 120px; font-size: 10px; font-weight: 500; }
    .aging-bar-bg { flex: 1; height: 10px; background: #f3f4f6; border-radius: 5px; overflow: hidden; }
    .aging-bar-fill { height: 100%; border-radius: 5px; }
    .aging-value { width: 100px; text-align: right; font-size: 10px; font-weight: 600; }

    /* Two columns */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* Footer */
    .report-footer {
      margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb;
      text-align: center; font-size: 9px; color: #9ca3af;
    }

    @media print {
      body { padding: 0; }
      .report-wrapper { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-wrapper">
    <!-- Header -->
    <div class="report-header">
      <div>
        <h1>InvoiceQu</h1>
        <div class="subtitle">Laporan Keuangan</div>
      </div>
      <div class="meta">
        <div>Periode: <strong>${data.period}</strong></div>
        <div>Tanggal: <strong>${dateStr}</strong></div>
        <div>Total Invoice: <strong>${data.invoices.length}</strong></div>
      </div>
    </div>

    <!-- KPI -->
    <div class="section">
      <div class="section-title">Ringkasan Kinerja</div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="label">Total Pendapatan</div>
          <div class="value green">${fmtCur(data.kpis.totalRevenue)}</div>
        </div>
        <div class="kpi-card">
          <div class="label">Belum Dibayar</div>
          <div class="value blue">${fmtCur(data.kpis.totalPending)}</div>
        </div>
        <div class="kpi-card">
          <div class="label">Jatuh Tempo</div>
          <div class="value red">${fmtCur(data.kpis.totalOverdue)}</div>
        </div>
        <div class="kpi-card">
          <div class="label">Rata-rata Invoice</div>
          <div class="value purple">${fmtCur(data.kpis.avgInvoice)}</div>
        </div>
      </div>
    </div>

    <!-- Status Distribution -->
    <div class="section">
      <div class="section-title">Distribusi Status Invoice</div>
      <div class="status-grid">
        ${[
          { label: 'Lunas', count: data.kpis.paidCount, color: '#10b981' },
          { label: 'Terkirim', count: data.kpis.sentCount, color: '#3b82f6' },
          { label: 'Jatuh Tempo', count: data.kpis.overdueCount, color: '#ef4444' },
          { label: 'Draft', count: data.kpis.draftCount, color: '#6b7280' },
          { label: 'DP', count: data.kpis.dpCount, color: '#f59e0b' },
        ].map(s => `
          <div class="status-card">
            <div class="count" style="color:${s.color}">${s.count}</div>
            <div class="label"><span class="dot" style="background:${s.color}"></span>${s.label}</div>
          </div>
        `).join('')}
      </div>
      <div style="text-align:right; margin-top:8px; font-size:10px; color:#6b7280;">
        Tingkat Koleksi: <strong style="color:#1a1a2e">${data.kpis.collectionRate}%</strong>
      </div>
    </div>

    <div class="two-col">
      <!-- Monthly Revenue -->
      <div class="section">
        <div class="section-title">Tren Pendapatan Bulanan</div>
        ${data.monthlyRevenue.length === 0
          ? '<div style="text-align:center;color:#9ca3af;padding:20px 0;">Belum ada data</div>'
          : (() => {
              const maxRev = Math.max(...data.monthlyRevenue.map(r => r.revenue), 1);
              return `<div class="bar-chart">
                ${data.monthlyRevenue.map(r => `
                  <div class="bar-col">
                    <div class="bar-value">${fmtCur(r.revenue)}</div>
                    <div class="bar" style="height:${Math.max((r.revenue / maxRev) * 80, 3)}px"></div>
                    <div class="bar-label">${r.month}</div>
                  </div>
                `).join('')}
              </div>`;
            })()
        }
      </div>

      <!-- Top Clients -->
      <div class="section">
        <div class="section-title">Klien Teratas</div>
        ${data.topClients.length === 0
          ? '<div style="text-align:center;color:#9ca3af;padding:20px 0;">Belum ada data</div>'
          : `<table>
              <thead><tr><th>#</th><th>Klien</th><th class="text-center">Inv</th><th class="text-right">Pendapatan</th></tr></thead>
              <tbody>
                ${data.topClients.map((c, i) => `
                  <tr>
                    <td class="font-bold">${i + 1}</td>
                    <td class="font-semibold">${c.name}</td>
                    <td class="text-center">${c.count}</td>
                    <td class="text-right font-semibold">${fmtCur(c.revenue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
        }
      </div>
    </div>

    <!-- Aging -->
    <div class="section">
      <div class="section-title">Aging Piutang</div>
      ${[
        { label: 'Belum Jatuh Tempo', value: data.agingBuckets.current, color: '#10b981' },
        { label: '1-30 Hari Lewat', value: data.agingBuckets['1-30'], color: '#f59e0b' },
        { label: '31-60 Hari Lewat', value: data.agingBuckets['31-60'], color: '#f97316' },
        { label: '61-90 Hari Lewat', value: data.agingBuckets['61-90'], color: '#ef4444' },
        { label: '> 90 Hari Lewat', value: data.agingBuckets['90+'], color: '#991b1b' },
      ].map(b => {
        const maxAging = Math.max(data.agingBuckets.current, data.agingBuckets['1-30'], data.agingBuckets['31-60'], data.agingBuckets['61-90'], data.agingBuckets['90+'], 1);
        return `
          <div class="aging-row">
            <div class="aging-label" style="color:${b.color}">${b.label}</div>
            <div class="aging-bar-bg">
              <div class="aging-bar-fill" style="width:${(b.value / maxAging) * 100}%;background:${b.color}"></div>
            </div>
            <div class="aging-value">${fmtCur(b.value)}</div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Invoice Detail Table -->
    <div class="section">
      <div class="section-title">Detail Invoice</div>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nomor</th>
            <th>Klien</th>
            <th class="text-center">Status</th>
            <th class="text-right">Total</th>
            <th class="text-right">Dibayar</th>
            <th class="text-right">Sisa</th>
            <th>Jatuh Tempo</th>
          </tr>
        </thead>
        <tbody>
          ${data.invoices.map((inv, i) => {
            const badgeClass = inv.status === 'paid' ? 'badge-paid' : inv.status === 'sent' ? 'badge-sent' : inv.status === 'overdue' ? 'badge-overdue' : inv.status === 'partially_paid' ? 'badge-dp' : 'badge-draft';
            return `
              <tr>
                <td>${i + 1}</td>
                <td class="font-semibold">${inv.number || inv.invoice_number || '-'}</td>
                <td>${inv.client_name}</td>
                <td class="text-center"><span class="badge ${badgeClass}">${statusMap[inv.status] || inv.status}</span></td>
                <td class="text-right font-semibold">${fmtCur(convertToIDR(inv.total, inv.currency, data.rates || undefined, inv.exchange_rate_idr))}</td>
                <td class="text-right">${fmtCur(convertToIDR(inv.amount_paid || 0, inv.currency, data.rates || undefined, inv.exchange_rate_idr))}</td>
                <td class="text-right">${fmtCur(convertToIDR(inv.amount_remaining || 0, inv.currency, data.rates || undefined, inv.exchange_rate_idr))}</td>
                <td>${inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="report-footer">
      Digenerate oleh InvoiceQu &bull; ${dateStr} &bull; Laporan ini bersifat rahasia
    </div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
