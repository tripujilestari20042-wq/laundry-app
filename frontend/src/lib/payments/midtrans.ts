'use client';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface SnapConfig {
  snap_script_url: string;
  client_key: string;
}

function loadSnapScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.setAttribute('data-client-key', '');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap'));
    document.body.appendChild(script);
  });
}

export async function openMidtransSnap(
  snapToken: string,
  config: SnapConfig
): Promise<'success' | 'pending' | 'error' | 'close'> {
  await loadSnapScript(config.snap_script_url);

  if (!window.snap) {
    throw new Error('Midtrans Snap tidak tersedia');
  }

  return new Promise((resolve) => {
    window.snap!.pay(snapToken, {
      onSuccess: () => resolve('success'),
      onPending: () => resolve('pending'),
      onError: () => resolve('error'),
      onClose: () => resolve('close'),
    });
  });
}
