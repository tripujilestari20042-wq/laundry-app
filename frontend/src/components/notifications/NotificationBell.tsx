'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import { useToast } from '@/components/notifications/ToastProvider';
import { playNotificationSound } from '@/lib/notifications/sound';
import type { UserRole } from '@/types';

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'new_order' | 'order_completed';
  title: string;
  message: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  role: UserRole;
  playSoundOnNew?: boolean;
}

const POLL_INTERVAL_MS = 12_000;

export default function NotificationBell({ role, playSoundOnNew = false }: NotificationBellProps) {
  const supabase = createClient();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await api.get<{ data: AppNotification[]; unread_count: number }>(
        '/api/notifications?limit=25',
        session.access_token
      );

      if (initializedRef.current) {
        const fresh = res.data.filter((n) => !knownIdsRef.current.has(n.id));
        for (const n of fresh) {
          showToast(
            n.title,
            n.message,
            n.type === 'order_completed' ? 'success' : 'info'
          );
          if (playSoundOnNew && n.type === 'new_order' && !n.is_read) {
            playNotificationSound();
          }
          if (role === 'pelanggan' && n.type === 'order_completed' && !n.is_read) {
            playNotificationSound();
          }
        }
      } else {
        initializedRef.current = true;
      }

      knownIdsRef.current = new Set(res.data.map((n) => n.id));
      setNotifications(res.data);
      setUnreadCount(res.unread_count);
    } catch {
      /* silent — connection issues handled elsewhere */
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast, playSoundOnNew, role]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markRead(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await api.patch(`/api/notifications/${id}/read`, {}, session.access_token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await api.patch('/api/notifications/read-all', {}, session.access_token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }

  function getNotificationLink(n: AppNotification): string | null {
    if (!n.order_id) return null;
    if (role === 'admin') return `/admin/orders/${n.order_id}`;
    return `/orders/${n.order_id}`;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-colors shadow-sm"
        aria-label="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="font-semibold text-slate-900 text-sm">Notifikasi</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-primary-600 hover:underline font-medium"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Belum ada notifikasi</p>
              ) : (
                notifications.map((n) => {
                  const href = getNotificationLink(n);
                  const content = (
                    <div
                      className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        !n.is_read ? 'bg-sky-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(n.created_at).toLocaleString('id-ID')}
                          </p>
                        </div>
                        {!n.is_read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markRead(n.id);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600"
                            title="Tandai dibaca"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );

                  return href ? (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={() => {
                        if (!n.is_read) markRead(n.id);
                        setOpen(false);
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={n.id}>{content}</div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
