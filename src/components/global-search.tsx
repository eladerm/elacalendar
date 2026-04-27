"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Users, Package, Calendar, BotMessageSquare, Sparkles, FileText, Settings, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: string;
  icon: React.ReactNode;
  color: string;
};

// Static quick-links for settings / config pages
const QUICK_LINKS: SearchResult[] = [
  { id: 'ql-chat',      title: 'Bandeja de Chat',    subtitle: 'Conversaciones activas',   href: '/crm/chat',          category: 'Módulos', icon: <Users className="w-4 h-4"/>,           color: 'text-emerald-600 bg-emerald-50' },
  { id: 'ql-inv',       title: 'Inventario',          subtitle: 'Control de productos',     href: '/inventario',        category: 'Módulos', icon: <Package className="w-4 h-4"/>,         color: 'text-cyan-600 bg-cyan-50' },
  { id: 'ql-cal',       title: 'Calendario',          subtitle: 'Citas y agenda',           href: '/',                  category: 'Módulos', icon: <Calendar className="w-4 h-4"/>,        color: 'text-indigo-600 bg-indigo-50' },
  { id: 'ql-bots',      title: 'Chatbots',            subtitle: 'Flujos de automatización', href: '/crm/chatbots',      category: 'Módulos', icon: <BotMessageSquare className="w-4 h-4"/>, color: 'text-teal-600 bg-teal-50' },
  { id: 'ql-ai',        title: 'Asistente Ela AI',    subtitle: 'Inteligencia artificial',  href: '/crm/asistentes',    category: 'Módulos', icon: <Sparkles className="w-4 h-4"/>,        color: 'text-amber-600 bg-amber-50' },
  { id: 'ql-factura',   title: 'Facturación',         subtitle: 'Documentos y cobros',      href: '/facturacion',       category: 'Módulos', icon: <FileText className="w-4 h-4"/>,        color: 'text-rose-600 bg-rose-50' },
  { id: 'ql-config',    title: 'Configuración',       subtitle: 'Ajustes del sistema',      href: '/crm/configuracion', category: 'Config',  icon: <Settings className="w-4 h-4"/>,        color: 'text-slate-600 bg-slate-100' },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query_text, setQueryText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Open with Ctrl+K / ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQueryText('');
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Keyboard navigation
  const allResults = query_text.trim() ? results : QUICK_LINKS;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allResults.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && allResults[selected]) {
        navigate(allResults[selected].href);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, allResults, selected]);

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  // Search across Firestore collections
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const lower = q.toLowerCase();
    const found: SearchResult[] = [];

    try {
      // Contacts
      const contactSnap = await getDocs(query(collection(db, 'crm_contacts'), limit(50)));
      contactSnap.docs.forEach(d => {
        const data = d.data();
        if (data.name?.toLowerCase().includes(lower) || data.waId?.includes(lower)) {
          found.push({ id: `contact-${d.id}`, title: data.name, subtitle: `WhatsApp: +${data.waId}`, href: '/crm/contactos', category: 'Contactos', icon: <Users className="w-4 h-4"/>, color: 'text-[#25D366] bg-[#25D366]/10' });
        }
      });

      // Inventory
      const invSnap = await getDocs(query(collection(db, 'inventory'), limit(50)));
      invSnap.docs.forEach(d => {
        const data = d.data();
        if (data.name?.toLowerCase().includes(lower) || data.sku?.toLowerCase().includes(lower)) {
          found.push({ id: `inv-${d.id}`, title: data.name, subtitle: `Stock: ${data.stock ?? '–'} | ${data.category || 'Producto'}`, href: '/inventario', category: 'Inventario', icon: <Package className="w-4 h-4"/>, color: 'text-cyan-600 bg-cyan-50' });
        }
      });

      // Events / Appointments
      const evSnap = await getDocs(query(collection(db, 'events'), limit(50)));
      evSnap.docs.forEach(d => {
        const data = d.data();
        if (data.title?.toLowerCase().includes(lower) || data.clientName?.toLowerCase().includes(lower)) {
          const dateStr = data.start?.toDate ? data.start.toDate().toLocaleDateString('es-EC') : '';
          found.push({ id: `ev-${d.id}`, title: data.title || data.clientName, subtitle: `Cita: ${dateStr}`, href: '/', category: 'Citas', icon: <Calendar className="w-4 h-4"/>, color: 'text-indigo-600 bg-indigo-50' });
        }
      });

      // Services
      const svcSnap = await getDocs(query(collection(db, 'services'), limit(50)));
      svcSnap.docs.forEach(d => {
        const data = d.data();
        if (data.name?.toLowerCase().includes(lower)) {
          found.push({ id: `svc-${d.id}`, title: data.name, subtitle: data.description || 'Servicio', href: '/servicios', category: 'Servicios', icon: <Sparkles className="w-4 h-4"/>, color: 'text-fuchsia-600 bg-fuchsia-50' });
        }
      });

      // Chatbots
      const botSnap = await getDocs(query(collection(db, 'botConfig'), limit(20)));
      botSnap.docs.forEach(d => {
        const data = d.data();
        if (data.name?.toLowerCase().includes(lower) || data.trigger?.toLowerCase().includes(lower)) {
          found.push({ id: `bot-${d.id}`, title: data.name || 'Bot', subtitle: `Trigger: ${data.trigger || '–'}`, href: `/crm/chatbots/${d.id}`, category: 'Chatbots', icon: <BotMessageSquare className="w-4 h-4"/>, color: 'text-teal-600 bg-teal-50' });
        }
      });

      // Quick links filter
      QUICK_LINKS.forEach(ql => {
        if (ql.title.toLowerCase().includes(lower) || ql.subtitle?.toLowerCase().includes(lower)) {
          found.push(ql);
        }
      });

    } catch (e) { /* silent */ }
    setResults(found.slice(0, 12));
    setLoading(false);
    setSelected(0);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query_text), 300);
    return () => clearTimeout(t);
  }, [query_text, doSearch]);

  // Group results by category
  const grouped = allResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  let globalIdx = 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent text-[12px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline font-normal">Buscar...</span>
        <kbd className="hidden md:inline text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-in fade-in duration-150" />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4">
        <div
          ref={panelRef}
          className="w-full max-w-[620px] bg-white rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.25)] border border-slate-200/80 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            {loading
              ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />
              : <Search className="w-5 h-5 text-slate-400 shrink-0" />
            }
            <input
              ref={inputRef}
              value={query_text}
              onChange={e => setQueryText(e.target.value)}
              placeholder="Buscar contacto, producto, cita, bot, configuración..."
              className="flex-1 text-sm text-slate-800 bg-transparent outline-none placeholder:text-slate-400 font-medium"
            />
            {query_text && (
              <button onClick={() => setQueryText('')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-200">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto py-2">
            {!query_text.trim() && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-2">Accesos rápidos</p>
            )}
            {query_text.trim() && results.length === 0 && !loading && (
              <div className="py-12 text-center">
                <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Sin resultados para <span className="font-bold text-slate-600">"{query_text}"</span></p>
              </div>
            )}
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-4 pt-3 pb-1">{cat}</p>
                {items.map(item => {
                  const idx = globalIdx++;
                  const isSelected = idx === selected;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelected(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                        isSelected ? "bg-slate-100" : "hover:bg-slate-50"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.color)}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                        {item.subtitle && <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>}
                      </div>
                      <ArrowRight className={cn("w-4 h-4 shrink-0 transition-opacity", isSelected ? "text-slate-400 opacity-100" : "opacity-0")} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 px-1 rounded font-mono">↑↓</kbd> Navegar</span>
            <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 px-1 rounded font-mono">↵</kbd> Abrir</span>
            <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 px-1 rounded font-mono">ESC</kbd> Cerrar</span>
            <span className="ml-auto">Busca en: contactos · inventario · citas · bots · servicios</span>
          </div>
        </div>
      </div>
    </>
  );
}
