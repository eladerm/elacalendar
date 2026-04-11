"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  MessageSquare, 
  Layers, 
  Send, 
  Users, 
  Settings, 
  HelpCircle, 
  Zap, 
  PlusCircle, 
  LayoutDashboard,
  Smartphone,
  Megaphone,
  Briefcase,
  Bot,
  Menu,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const crmMenuItems = [
  { group: 'Principal', items: [
    { name: 'Dashboard', href: '/crm', icon: LayoutDashboard },
    { name: 'Chat', href: '/crm/chat', icon: MessageSquare },
    { name: 'Embudos', href: '/crm/embudos', icon: Layers },
    { name: 'Iniciar chat', href: '/crm/nuevo', icon: PlusCircle },
  ]},
  { group: 'Gestión', items: [
    { name: 'Campañas', href: '/crm/campanas', icon: Megaphone },
    { name: 'Contactos', href: '/crm/contactos', icon: Users },
    { name: 'WhatsApp', href: '/crm/whatsapp', icon: Smartphone },
  ]},
  { group: 'Avanzado', items: [
    { name: 'Automatización', href: '/crm/chatbots', icon: Zap },
    { name: 'Asistentes IA', href: '/crm/asistentes', icon: Bot },
    { name: 'Reportes', href: '/crm/reportes', icon: BarChart3 },
    { name: 'Configuración', href: '/crm/configuracion', icon: Settings },
  ]}
];

const SidebarContent = ({ pathname, onClick = () => {} }: { pathname: string, onClick?: () => void }) => (
  <div className="flex flex-col h-full bg-[#1e293b] text-white">
    <div className="p-4 border-b border-slate-700/50 block">
      <Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-emerald-500 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Volver a Calendario
      </Link>
    </div>
    <div className="p-6 flex-1 overflow-y-auto">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20 shrink-0">
          W
        </div>
        <span className="font-black text-xl tracking-tight text-white italic uppercase">CRM AI</span>
      </div>

      <nav className="space-y-8">
        {crmMenuItems.map((group) => (
          <div key={group.group}>
            <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
              {group.group}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClick}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all group",
                        isActive 
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <item.icon className={cn(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-white" : "text-slate-500 group-hover:text-white/80"
                      )} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>

    <div className="mt-auto p-6 border-t border-slate-700/50 shrink-0">
      <Link onClick={onClick} href="/crm/guia" className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-slate-400 hover:text-emerald-400 transition-colors">
        <BookOpen className="w-4 h-4" />
        Guía de Operación
      </Link>
    </div>
  </div>
);

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0f172a] text-white overflow-hidden w-full">
      
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-[#1e293b]/50 backdrop-blur-md border-r border-slate-700/50 flex-col h-full shrink-0">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-auto relative min-w-0 flex flex-col w-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent)] pointer-events-none" />
        
        {/* Header móvil */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-700/50 bg-[#1e293b] sticky top-0 z-10">
           <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-white font-bold text-sm shadow-emerald-500/20">W</div>
            <span className="font-black tracking-tight text-white italic uppercase text-sm">CRM AI</span>
          </div>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800 border-slate-700">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-slate-700 bg-[#1e293b]">
              <SidebarContent pathname={pathname} onClick={() => setIsOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
