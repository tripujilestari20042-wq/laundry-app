import type { LaundryStatus, PaymentStatus } from '@/types';
import { LAUNDRY_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/types';

const LAUNDRY_STYLES: Record<LaundryStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  pickup: 'bg-sky-50 text-sky-700 ring-sky-200',
  processing: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  ready: 'bg-violet-50 text-violet-700 ring-violet-200',
  delivering: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  pembatalan_diajukan: 'bg-orange-50 text-orange-700 ring-orange-200',
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  unpaid: 'bg-rose-50 text-rose-700 ring-rose-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  refunded: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function LaundryStatusBadge({ status }: { status: LaundryStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${LAUNDRY_STYLES[status]}`}>
      {LAUNDRY_STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${PAYMENT_STYLES[status]}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
