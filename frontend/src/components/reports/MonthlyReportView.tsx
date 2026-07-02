'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Scale,
  Loader2,
  Printer,
  FileDown,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import {
  LAUNDRY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type LaundryStatus,
  type PaymentMethod,
} from '@/types';

const MonthlyRevenueBarChart = dynamic(
  () => import('@/components/reports/MonthlyRevenueBarChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-sm">
        Memuat grafik...
      </div>
    ),
  }
);

interface ReportSummary {
  total_revenue: number;
  completed_orders: number;
  cancelled_orders: number;
  total_weight_kg: number;
  total_orders: number;
}

interface ReportTransaction {
  id: string;
  customer_name: string;
  service_name: string;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: string;
  laundry_status: LaundryStatus;
  weight_qty: number;
  created_at: string;
}

interface MonthlyReportData {
  month: number;
  year: number;
  payment_method: string;
  summary: ReportSummary;
  weekly_trend: { week: string; revenue: number }[];
  transactions: ReportTransaction[];
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function MonthlyReportView() {
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'midtrans'>('all');
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
        payment_method: paymentMethod,
      });
      const res = await api.get<{ data: MonthlyReportData }>(
        `/api/admin/reports/monthly?${params}`,
        session.access_token
      );
      setReport(res.data);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [supabase, month, year, paymentMethod]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  function handlePrint() {
    window.print();
  }

  const summaryCards = report
    ? [
        {
          label: 'Total Pendapatan',
          value: `Rp ${report.summary.total_revenue.toLocaleString('id-ID')}`,
          icon: Banknote,
          color: 'text-emerald-600 bg-emerald-50',
        },
        {
          label: 'Pesanan Selesai',
          value: report.summary.completed_orders,
          icon: CheckCircle2,
          color: 'text-sky-600 bg-sky-50',
        },
        {
          label: 'Pesanan Batal',
          value: report.summary.cancelled_orders,
          icon: XCircle,
          color: 'text-rose-600 bg-rose-50',
        },
        {
          label: 'Total Cucian (kg)',
          value: `${report.summary.total_weight_kg} kg`,
          icon: Scale,
          color: 'text-violet-600 bg-violet-50',
        },
      ]
    : [];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Transaksi Bulanan</h1>
          <p className="text-slate-500 text-sm mt-1">Analisis keuangan & performa operasional</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <FileDown className="w-4 h-4" /> Ekspor PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8 print:hidden">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Bulan</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tahun</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Metode Pembayaran</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai</option>
            <option value="midtrans">Midtrans</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm flex items-start gap-2 text-amber-800 print:hidden">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 print:hidden">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          Memuat laporan...
        </div>
      ) : report ? (
        <div ref={printRef} id="report-print-area">
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold">Laporan Transaksi — {MONTHS[month - 1]} {year}</h1>
            <p className="text-sm text-slate-600">
              Metode: {paymentMethod === 'all' ? 'Semua' : PAYMENT_METHOD_LABELS[paymentMethod as PaymentMethod]}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {summaryCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className={`p-2.5 rounded-xl ${color}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 print:break-inside-avoid">
            <h2 className="font-semibold text-slate-900 mb-4">
              Tren Pendapatan Mingguan — {MONTHS[month - 1]} {year}
            </h2>
            <MonthlyRevenueBarChart data={report.weekly_trend} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                Detail Transaksi ({report.transactions.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left p-4 font-medium">Tanggal</th>
                    <th className="text-left p-4 font-medium">Pelanggan</th>
                    <th className="text-left p-4 font-medium">Layanan</th>
                    <th className="text-left p-4 font-medium">Metode</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="p-4 text-slate-600">
                        {new Date(tx.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="p-4 font-medium text-slate-900">{tx.customer_name}</td>
                      <td className="p-4 text-slate-600">{tx.service_name}</td>
                      <td className="p-4">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {PAYMENT_METHOD_LABELS[tx.payment_method]}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">
                          {LAUNDRY_STATUS_LABELS[tx.laundry_status]}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {PAYMENT_STATUS_LABELS[tx.payment_status as keyof typeof PAYMENT_STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-900">
                        Rp {tx.total_amount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                  {!report.transactions.length && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        Tidak ada transaksi pada periode ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
