"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Calendar, Package, Users, CheckCheck, AlertTriangle, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export type AppNotification = {
  id: string;
  type: 'appointment' | 'inventory' | 'staff' | 'system';
  title: string;
  body: string;
  href?: string;
  timestamp: number;
  read: boolean;
  icon?: React.ReactNode;
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Load upcoming appointments (next 24h) ──────────────────────────────
  useEffect(() => {
    const now = Timestamp.now();
    const in24h = Timestamp.fromMillis(Date.now() + 86400000);
    const q = query(
      collection(db, 'events'),
      where('start', '>=', now),
      where('start', '<=', in24h),
      orderBy('start', 'asc'),
      limit(5)
    );
    const unsub = onSnapshot(q, snap => {
      const apptNotifs: AppNotification[] = snap.docs.map(doc => {
        const d = doc.data();
        const start: Timestamp = d.start;
        const ms = start?.toMillis?.() ?? Date.now();
        const timeStr = new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          id: `appt-${doc.id}`,
          type: 'appointment',
          title: 'Cita próxima',
          body: `${d.clientName || d.title || 'Sin cliente'} — ${timeStr}`,
          href: '/',
          timestamp: ms,
          read: false,
        };
      });
      setNotifications(prev => {
        const otherNotifs = prev.filter(n => n.type !== 'appointment');
        return [...apptNotifs, ...otherNotifs].sort((a, b) => b.timestamp - a.timestamp);
      });
    }, () => {}); // silent fail
    return () => unsub();
  }, []);

  // ── Load low-stock inventory items ─────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'inventory'),
      where('stock', '<=', 5),
      limit(5)
    );
    const unsub = onSnapshot(q, snap => {
      const invNotifs: AppNotification[] = snap.docs
        .filter(doc => {
          const d = doc.data();
          return typeof d.stock === 'number' && d.stock <= (d.minStock ?? 5);
        })
        .map(doc => {
          const d = doc.data();
          return {
            id: `inv-${doc.id}`,
            type: 'inventory',
            title: 'Stock bajo',
            body: `${d.name || 'Producto'}: ${d.stock} unidad(es) restantes`,
            href: '/inventario',
            timestamp: Date.now(),
            read: false,
          };
        });
      setNotifications(prev => {
        const otherNotifs = prev.filter(n => n.type !== 'inventory');
        return [...invNotifs, ...otherNotifs].sort((a, b) => b.timestamp - a.timestamp);
      });
    }, () => {});
    return () => unsub();
  }, []);

  const iconFor = (type: AppNotification['type']) => {
    switch (type) {
      case 'appointment': return <Calendar className="w-4 h-4 text-indigo-500" />;
      case 'inventory':   return <Package className="w-4 h-4 text-amber-500" />;
      case 'staff':       return <Users className="w-4 h-4 text-blue-500" />;
      default:            return <Sparkles className="w-4 h-4 text-emerald-500" />;
    }
  };

  const colorFor = (type: AppNotification['type']) => {
    switch (type) {
      case 'appointment': return 'bg-indigo-50 border-indigo-100';
      case 'inventory':   return 'bg-amber-50 border-amber-100';
      case 'staff':       return 'bg-blue-50 border-blue-100';
      default:            return 'bg-emerald-50 border-emerald-100';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        title="Notificaciones"
      >
        <Bell className={cn("w-5 h-5 transition-transform", open && "scale-110 text-indigo-600")} />
        {unread > 0 && !open && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center text-[9px] font-black text-white bg-red-500 rounded-full border-2 border-white animate-bounce">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div className="absolute right-0 top-14 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-200/80 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-3 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-800">Notificaciones</h3>
              {notifications.length > 0 && (
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  {notifications.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="text-[10px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                Marcar leídas
              </button>
              <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[420px] divide-y divide-slate-100/60">
            {notifications.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <Bell className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">Sin notificaciones pendientes</p>
                <p className="text-xs">Todo está en orden ✓</p>
              </div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  href={n.href || '#'}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors group",
                    !n.read && "bg-indigo-50/30"
                  )}
                >
                  <div className={cn("w-8 h-8 shrink-0 rounded-xl flex items-center justify-center border", colorFor(n.type))}>
                    {iconFor(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-bold text-slate-800 truncate">{n.title}</p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(n.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed truncate">{n.body}</p>
                    {!n.read && (
                      <span className="inline-block mt-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1.5" />
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[10px] text-slate-400 text-center">
              Actualizándose en tiempo real · Firestore
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
