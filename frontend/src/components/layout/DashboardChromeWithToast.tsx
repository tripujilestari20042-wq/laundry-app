'use client';

import DashboardChrome from '@/components/layout/DashboardChrome';
import { ToastProvider } from '@/components/notifications/ToastProvider';
import type { UserRole } from '@/types';

interface DashboardChromeWithToastProps {
  role: UserRole;
  fullName?: string | null;
  children: React.ReactNode;
}

export default function DashboardChromeWithToast({
  role,
  fullName,
  children,
}: DashboardChromeWithToastProps) {
  return (
    <ToastProvider>
      <DashboardChrome role={role} fullName={fullName}>
        {children}
      </DashboardChrome>
    </ToastProvider>
  );
}
