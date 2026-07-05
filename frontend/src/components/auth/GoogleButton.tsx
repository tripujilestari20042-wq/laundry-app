'use client';

import GoogleIcon from './GoogleIcon';
import { startGoogleOAuth } from '@/lib/auth/google';
import type { UserRole } from '@/types';

interface GoogleButtonProps {
  label?: string;
  disabled?: boolean;
  /** Hanya untuk registrasi — login Google tidak perlu role (diambil dari profil). */
  role?: UserRole;
  onError?: (message: string) => void;
}

export default function GoogleButton({
  label = 'Lanjutkan dengan Google',
  disabled = false,
  role,
  onError,
}: GoogleButtonProps) {
  async function handleGoogleAuth() {
    const result = await startGoogleOAuth(role);
    if (result.error) onError?.(result.error);
  }

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 border border-slate-200 bg-white py-3 px-4 rounded-xl font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
    >
      <GoogleIcon />
      <span>{label}</span>
    </button>
  );
}
