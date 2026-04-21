"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare, Users, Layers, Send, Settings, Zap, BarChart3,
  PlusCircle, Smartphone, Megaphone, Bot, Menu, BookOpen,
  Instagram, Facebook, ShoppingCart, Briefcase, ChevronRight,
  Bell, Search, HelpCircle, TrendingUp, Star, Clock, Filter,
  AlertCircle, CheckCircle2, Tag, UserCheck, LifeBuoy, Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FloatingChat } from '@/components/floating-chat';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

// ─── Primary Icon Modules (Column 1) ───────────────────────────────────────
const APP_MODULES = [
  { name: 'Bandeja',      href: '/crm/chat',          icon: Inbox,        badge: 'unread' },
  { name: 'Contactos',    href: '/crm/contactos',     icon: Users,        badge: null },
  { name: 'Pipeline',     href: '/crm/embudos',       icon: Layers,       badge: null },
  { name: 'Campañas',     href: '/crm/campanas',      icon: Megaphone,    badge: null },
  { name: 'Automatización', href: '/crm/automatizacion', icon: Zap,       badge: null },
  { name: 'Chatbots',     href: '/crm/chatbots',      icon: Bot,          badge: null },
  { name: 'Ventas',       href: '/crm/ventas',        icon: ShoppingCart, badge: null },
  { name: 'Reportes',     href: '/crm/reportes',      icon: BarChart3,    badge: null },
  { name: 'Ajustes',      href: '/crm/configuracion', icon: Settings,     badge: null },
];

// ─── Context-Specific Sidebar Content ──────────────────────────────────────
function SidebarContent({ pathname }: { pathname: string }) {

  const navLink = (href: string, label: string, icon: React.ReactNode, exact = false) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link href={href} className={cn(
        "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 border border-transparent",
        active
          ? "bg-[var(--bg-selected)] text-[var(--color-primary)] border-[var(--color-primary)]/20 font-semibold"
          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-selected)]"
      )}>
        {icon}
        <span className="truncate">{label}</span>
        {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
      </Link>
    );
  };

  const sectionHead = (title: string) => (
    <p className="px-3 pt-4 pb-1 text-[10px] font-black text-[color:var(--text-secondary)] uppercase tracking-[0.12em]">{title}</p>
  );

  // ── BANDEJA / CHAT ──────────────────────────────────────────────────────
  if (pathname.startsWith('/crm/chat') || pathname === '/crm') {
    return (
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {sectionHead('Mis conversaciones')}
        {navLink('/crm/chat', 'Todas', <Menu className="w-3.5 h-3.5 shrink-0" />, true)}
        {navLink('/crm/chat?filter=mine', 'Asignadas a mí', <UserCheck className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/chat?filter=unassigned', 'Sin asignar', <AlertCircle className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/chat?filter=stalled', 'Leads estancados', <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />)}

        {sectionHead('Por estado')}
        {navLink('/crm/chat?status=open', 'Abiertas', <MessageSquare className="w-3.5 h-3.5 shrink-0 text-emerald-500" />)}
        {navLink('/crm/chat?status=waiting', 'En espera', <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />)}
        {navLink('/crm/chat?status=closed', 'Cerradas', <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />)}

        {sectionHead('Canales')}
        {navLink('/crm/chat?channel=whatsapp', 'WhatsApp', <Smartphone className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />)}
        {navLink('/crm/chat?channel=messenger', 'Messenger', <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#0084FF]" />)}
        {navLink('/crm/chat?channel=instagram', 'Instagram DM', <Instagram className="w-3.5 h-3.5 shrink-0 text-[#E1306C]" />)}
        {navLink('/crm/chat?channel=facebook', 'Facebook', <Facebook className="w-3.5 h-3.5 shrink-0 text-[#1877F2]" />)}

        {sectionHead('Herramientas')}
        {navLink('/crm/campanas', 'Campañas masivas', <Megaphone className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/contactos', 'Directorio', <Users className="w-3.5 h-3.5 shrink-0" />)}
      </div>
    );
  }

  // ── CHATBOTS ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/crm/chatbots')) {
    return (
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {sectionHead('Flujos bot')}
        {navLink('/crm/chatbots', 'Todos los flujos', <Bot className="w-3.5 h-3.5 shrink-0" />, true)}

        {sectionHead('Motor de IA')}
        {navLink('/crm/asistentes', 'Asistente Ela (IA)', <Star className="w-3.5 h-3.5 shrink-0 text-amber-500" />)}
        {navLink('/crm/automatizacion', 'Reglas automáticas', <Zap className="w-3.5 h-3.5 shrink-0" />)}

        {sectionHead('Recursos')}
        {navLink('/crm/chatbots?tab=variables', 'Variables del sistema', <Tag className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/chatbots?tab=templates', 'Plantillas', <Send className="w-3.5 h-3.5 shrink-0" />)}
      </div>
    );
  }

  // ── VENTAS ────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/crm/ventas')) {
    return (
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {sectionHead('Catálogo')}
        {navLink('/crm/ventas', 'Todos los productos', <ShoppingCart className="w-3.5 h-3.5 shrink-0" />, true)}

        {sectionHead('Pedidos')}
        {navLink('/crm/chat', 'Generar pedido en chat', <MessageSquare className="w-3.5 h-3.5 shrink-0 text-emerald-500" />)}
        {navLink('/crm/reportes', 'Historial de ventas', <TrendingUp className="w-3.5 h-3.5 shrink-0" />)}
      </div>
    );
  }

  // ── AUTOMATIZACION ────────────────────────────────────────────────────────
  if (pathname.startsWith('/crm/automatizacion')) {
    return (
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {sectionHead('Automatización')}
        {navLink('/crm/automatizacion', 'Reglas activas', <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500" />, true)}
        {navLink('/crm/chatbots', 'Flujos de chatbot', <Bot className="w-3.5 h-3.5 shrink-0" />)}

        {sectionHead('Disparadores')}
        {navLink('/crm/automatizacion?type=keyword', 'Por palabra clave', <MessageSquare className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/automatizacion?type=tag', 'Por etiqueta', <Tag className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/automatizacion?type=funnel', 'Por etapa de embudo', <Layers className="w-3.5 h-3.5 shrink-0" />)}
      </div>
    );
  }

  // ── EMBUDOS / PIPELINE ────────────────────────────────────────────────────
  if (pathname.startsWith('/crm/embudos')) {
    return (
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {sectionHead('Mis pipelines')}
        {navLink('/crm/embudos', 'Vista Kanban', <Layers className="w-3.5 h-3.5 shrink-0" />, true)}
        {navLink('/crm/embudos?view=list', 'Vista lista', <Menu className="w-3.5 h-3.5 shrink-0" />)}

        {sectionHead('Análisis')}
        {navLink('/crm/reportes', 'Funnel de conversión', <TrendingUp className="w-3.5 h-3.5 shrink-0" />)}
      </div>
    );
  }

  // ── CONTACTOS ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/crm/contactos')) {
    return (
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {sectionHead('Directorio')}
        {navLink('/crm/contactos', 'Todos los contactos', <Users className="w-3.5 h-3.5 shrink-0" />, true)}
        {navLink('/crm/contactos?filter=leads', 'Leads activos', <TrendingUp className="w-3.5 h-3.5 shrink-0 text-emerald-500" />)}
        {navLink('/crm/contactos?filter=stalled', 'Leads estancados', <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />)}

        {sectionHead('Organización')}
        {navLink('/crm/contactos?tab=tags', 'Etiquetas', <Tag className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/contactos?tab=segments', 'Segmentos', <Filter className="w-3.5 h-3.5 shrink-0" />)}
      </div>
    );
  }

  // ── REPORTES ──────────────────────────────────────────────────────────────
  if (pathname.startsWith('/crm/reportes')) {
    return (
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {sectionHead('Dashboard')}
        {navLink('/crm/reportes', 'Resumen general', <BarChart3 className="w-3.5 h-3.5 shrink-0" />, true)}
        {navLink('/crm/reportes?tab=agents', 'Por agente', <Users className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/reportes?tab=channels', 'Por canal', <Smartphone className="w-3.5 h-3.5 shrink-0" />)}

        {sectionHead('Ventas')}
        {navLink('/crm/reportes?tab=sales', 'Pedidos y revenue', <TrendingUp className="w-3.5 h-3.5 shrink-0 text-emerald-500" />)}
        {navLink('/crm/reportes?tab=funnel', 'Embudo de conversión', <Layers className="w-3.5 h-3.5 shrink-0" />)}
      </div>
    );
  }

  // ── CONFIGURACION ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/crm/configuracion')) {
    return (
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {sectionHead('Personalización')}
        {navLink('/crm/configuracion', 'Apariencia y temas', <Star className="w-3.5 h-3.5 shrink-0" />, true)}

        {sectionHead('Conexiones')}
        {navLink('/crm/configuracion#whatsapp', 'WhatsApp Business', <Smartphone className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />)}
        {navLink('/crm/configuracion#messenger', 'Messenger', <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#0084FF]" />)}
        {navLink('/crm/configuracion#instagram', 'Instagram DM', <Instagram className="w-3.5 h-3.5 shrink-0 text-[#E1306C]" />)}

        {sectionHead('Sistema')}
        {navLink('/crm/configuracion#agents', 'Agentes y roles', <Users className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/configuracion#templates', 'Plantillas de respuesta', <Send className="w-3.5 h-3.5 shrink-0" />)}
        {navLink('/crm/configuracion#tags', 'Etiquetas globales', <Tag className="w-3.5 h-3.5 shrink-0" />)}
      </div>
    );
  }

  // ── DEFAULT / CAMPAÑAS / OTROS ────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
      {sectionHead('Módulos')}
      {APP_MODULES.map(m => navLink(m.href, m.name, <m.icon className="w-3.5 h-3.5 shrink-0" />))}
    </div>
  );
}

// ─── CTA Button per module ──────────────────────────────────────────────────
function SidebarCTA({ pathname }: { pathname: string }) {
  const config: Record<string, { label: string; href: string; color: string }> = {
    '/crm/chat':          { label: 'Nueva conversación', href: '/crm/chat', color: 'bg-[var(--color-primary)] hover:opacity-90' },
    '/crm/chatbots':      { label: 'Nuevo chatbot',      href: '/crm/chatbots?new=1', color: 'bg-violet-600 hover:bg-violet-700' },
    '/crm/ventas':        { label: 'Nuevo producto',     href: '/crm/ventas?new=1', color: 'bg-emerald-600 hover:bg-emerald-700' },
    '/crm/automatizacion':{ label: 'Nueva regla',        href: '/crm/automatizacion?new=1', color: 'bg-amber-500 hover:bg-amber-600' },
    '/crm/embudos':       { label: 'Nuevo embudo',       href: '/crm/embudos?new=1', color: 'bg-[var(--color-primary)] hover:opacity-90' },
    '/crm/contactos':     { label: 'Nuevo contacto',     href: '/crm/contactos?new=1', color: 'bg-[var(--color-primary)] hover:opacity-90' },
    '/crm/campanas':      { label: 'Nueva campaña',      href: '/crm/campanas?new=1', color: 'bg-[var(--color-primary)] hover:opacity-90' },
    '/crm/reportes':      { label: 'Exportar reporte',   href: '/crm/reportes?export=1', color: 'bg-[var(--color-primary)] hover:opacity-90' },
    '/crm/configuracion': { label: 'Guardar cambios',    href: '/crm/configuracion', color: 'bg-[var(--color-primary)] hover:opacity-90' },
  };

  const key = Object.keys(config).find(k => pathname.startsWith(k)) || '/crm/chat';
  const cta = config[key];

  return (
    <div className="p-3 border-b border-[var(--border-light)]">
      <Link href={cta.href}>
        <button className={cn(
          "w-full flex items-center justify-center gap-2 text-white font-semibold text-[13px] rounded-xl h-10 transition-all shadow-sm",
          cta.color
        )}>
          <PlusCircle className="w-4 h-4" />
          {cta.label}
        </button>
      </Link>
    </div>
  );
}

// ─── Main Layout ────────────────────────────────────────────────────────────
export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // Live unread badge
  useEffect(() => {
    const q = query(collection(db, 'crm_chats'), where('unreadCount', '>', 0));
    const unsub = onSnapshot(q, snap => setUnreadCount(snap.size));
    return () => unsub();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] w-full font-sans">

      {/* ══ COLUMN 1: Slim Icon Rail (56px) ══════════════════════════════════ */}
      <aside className="fixed left-0 top-0 bottom-0 w-[56px] bg-[var(--bg-white)] border-r border-[var(--border-light)] flex flex-col items-center py-3 z-50 gap-1">

        {/* Logo / Brand */}
        <Link
          href="/crm/chat"
          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[15px] text-white shadow-md mb-3 transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
          title="Élapiel CRM"
        >
          É
        </Link>

        {/* Module Icons */}
        {APP_MODULES.map(module => {
          const isActive = pathname.startsWith(module.href);
          const showBadge = module.badge === 'unread' && unreadCount > 0;
          return (
            <Link
              key={module.href}
              href={module.href}
              title={module.name}
              className={cn(
                "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group",
                isActive
                  ? "text-[var(--color-primary)] bg-[var(--bg-selected)]"
                  : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-selected)]"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-primary)]" />
              )}
              <module.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 1.8} />
              {/* Unread badge */}
              {showBadge && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {/* Tooltip */}
              <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[11px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[100] shadow-lg">
                {module.name}
              </span>
            </Link>
          );
        })}

        {/* Bottom: Help */}
        <div className="mt-auto">
          <Link
            href="/crm/configuracion"
            title="Soporte"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-selected)] transition-all"
          >
            <LifeBuoy className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </Link>
        </div>
      </aside>

      {/* ══ COLUMN 2: Contextual Sidebar (240px) ═════════════════════════════ */}
      <aside className="fixed left-[56px] top-0 bottom-0 w-[240px] bg-[var(--bg-white)] border-r border-[var(--border-light)] flex flex-col z-40">

        {/* Module Title Bar */}
        <div className="px-4 py-3.5 border-b border-[var(--border-light)] flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] font-black text-[color:var(--text-secondary)] uppercase tracking-[0.12em]">
              {APP_MODULES.find(m => pathname.startsWith(m.href))?.name ?? 'CRM'}
            </p>
            <h2 className="text-[14px] font-black text-[color:var(--text-primary)] leading-none mt-0.5">
              Élapiel CRM
            </h2>
          </div>
          <Search className="w-4 h-4 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] cursor-pointer transition-colors" />
        </div>

        {/* CTA Button (context-sensitive) */}
        <SidebarCTA pathname={pathname} />

        {/* Scrollable Nav */}
        <SidebarContent pathname={pathname} />

        {/* Footer */}
        <div className="mt-auto border-t border-[var(--border-light)] p-2">
          <Link href="/crm/configuracion" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-selected)] transition-all">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Documentación</span>
          </Link>
          <Link href="/crm/configuracion" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-selected)] transition-all">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Centro de ayuda</span>
          </Link>
        </div>
      </aside>

      {/* ══ COLUMN 3: Main Content Area ══════════════════════════════════════ */}
      <main className="flex-1 overflow-hidden relative min-w-0 flex flex-col w-full h-full ml-[296px] bg-[var(--bg-app)]">

        {/* Top Header Bar */}
        <header className="h-[48px] bg-[var(--bg-white)] border-b border-[var(--border-light)] flex items-center px-5 gap-4 shrink-0 z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="font-black text-[color:var(--text-primary)]">
              {APP_MODULES.find(m => pathname.startsWith(m.href))?.name ?? 'CRM'}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Top Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search shortcut */}
            <button className="flex items-center gap-2 px-3 h-8 rounded-lg bg-[var(--bg-app)] border border-[var(--border-light)] text-[12px] text-[color:var(--text-secondary)] hover:border-[var(--color-primary)]/50 transition-all">
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Buscar...</span>
              <kbd className="hidden md:inline text-[10px] bg-[var(--border-light)] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-selected)] transition-all">
                <Bell className="w-4 h-4" />
              </button>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>

            {/* Config shortcut */}
            <Link href="/crm/configuracion">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-selected)] transition-all">
                <Settings className="w-4 h-4" />
              </button>
            </Link>

            {/* User avatar */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[13px] cursor-pointer hover:opacity-80 transition-all shadow-sm"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
              title="Mi cuenta"
            >
              E
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 w-full h-full overflow-hidden">
          {children}
        </div>

        <FloatingChat />
      </main>
    </div>
  );
}
