import crypto from 'crypto';
import { config } from '../config';

interface SnapTransactionParams {
  orderId: string;
  grossAmount: number;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
}

interface SnapResponse {
  token: string;
  redirect_url: string;
}

export function isMidtransConfigured(): boolean {
  return Boolean(config.midtrans.serverKey && config.midtrans.clientKey);
}

export async function createSnapToken(params: SnapTransactionParams): Promise<SnapResponse> {
  const { serverKey, isProduction } = config.midtrans;
  const baseUrl = isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';

  const auth = Buffer.from(`${serverKey}:`).toString('base64');

  const body = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.grossAmount),
    },
    customer_details: {
      email: params.customerEmail,
      first_name: params.customerName,
      phone: params.customerPhone || '',
    },
    enabled_payments: [
      'credit_card',
      'gopay',
      'shopeepay',
      'dana',
      'ovo',
      'qris',
      'bca_va',
      'bni_va',
      'bri_va',
      'permata_va',
      'echannel',
      'other_va',
    ],
  };

  const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json() as SnapResponse & { error_messages?: string[]; status_message?: string };

  if (!response.ok) {
    const msg = json.error_messages?.join(', ') || json.status_message || 'Gagal membuat Snap Token';
    throw new Error(msg);
  }

  if (!json.token) {
    throw new Error('Snap Token tidak diterima dari Midtrans');
  }

  return json;
}

export interface MidtransNotification {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}

export function verifyMidtransSignature(notification: MidtransNotification): boolean {
  const { serverKey } = config.midtrans;
  const payload = notification.order_id + notification.status_code + notification.gross_amount + serverKey;
  const expected = crypto.createHash('sha512').update(payload).digest('hex');
  return expected === notification.signature_key;
}

export function isPaymentSuccess(status: string, fraudStatus?: string): boolean {
  if (status === 'capture') {
    return fraudStatus === 'accept';
  }
  return status === 'settlement';
}

export function getMidtransClientKey(): string {
  return config.midtrans.clientKey;
}

export function getSnapScriptUrl(): string {
  return config.midtrans.isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
}

export async function refundMidtransTransaction(
  orderId: string,
  amount: number,
  reason = 'Pembatalan pesanan'
): Promise<{ success: boolean; message: string }> {
  const { serverKey, isProduction } = config.midtrans;
  if (!serverKey) {
    return { success: false, message: 'Midtrans tidak dikonfigurasi' };
  }

  const baseUrl = isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';

  const auth = Buffer.from(`${serverKey}:`).toString('base64');
  const refundKey = `refund-${orderId}-${Date.now()}`;

  const response = await fetch(`${baseUrl}/v2/${orderId}/refund`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      refund_key: refundKey,
      amount: Math.round(amount),
      reason,
    }),
  });

  const json = await response.json() as { status_code?: string; status_message?: string };

  if (!response.ok) {
    return {
      success: false,
      message: json.status_message || 'Refund Midtrans gagal — proses manual diperlukan',
    };
  }

  return { success: true, message: json.status_message || 'Refund berhasil diajukan' };
}
