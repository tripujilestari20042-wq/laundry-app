/** Parse harga dari input teks (mendukung format ID: 40.000, 40000). */
export function parseIdrInput(value: string): number {
  const cleaned = value.trim().replace(/\./g, '').replace(/,/g, '');
  if (!cleaned) return NaN;
  return Number(cleaned);
}

/** Format angka ke tampilan Rupiah tanpa prefix (contoh: 40000 → "40.000"). */
export function formatIdrInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return value.toLocaleString('id-ID');
}

/** Izinkan hanya digit dan pemisah ribuan saat mengetik. */
export function sanitizeIdrTyping(value: string): string {
  return value.replace(/[^\d.,]/g, '');
}
