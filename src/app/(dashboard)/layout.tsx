"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookUser, KanbanSquare, Settings, TrendingUp,
  BotMessageSquare, Store,
  MessageCircle, Sparkles, CalendarRange, FileCheck2, PieChart, Boxes, Activity, Users, LogOut, Search, Bell, UserCog, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingChat } from '@/components/floating-chat';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { ProfileFormDialog } from '@/components/profile-form-dialog';
import { NotificationBell } from '@/components/notification-bell';
import { GlobalSearch } from '@/components/global-search';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';

// ─── Primary Icon Modules ───────────────────────────────────────
const APP_MODULES = [
  { name: 'Calendario',     href: '/',                  icon: CalendarRange, color: 'text-indigo-600', bg: 'bg-indigo-50', activeBg: 'bg-indigo-600' },
  { name: 'Bandeja',        href: '/crm/chat',          icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', activeBg: 'bg-emerald-600' },
  { name: 'Embudos',        href: '/crm/embudos',       icon: KanbanSquare,  color: 'text-amber-500', bg: 'bg-amber-50', activeBg: 'bg-amber-500' },
  { name: 'IA & Auto',      href: '/crm/automatizacion', icon: Zap,          color: 'text-violet-600', bg: 'bg-violet-50', activeBg: 'bg-violet-600' },
  { name: 'Bots',           href: '/crm/chatbots',      icon: BotMessageSquare, color: 'text-teal-600', bg: 'bg-teal-50', activeBg: 'bg-teal-600' },
  { name: 'Contactos',      href: '/crm/contactos',     icon: BookUser,      color: 'text-blue-600', bg: 'bg-blue-50', activeBg: 'bg-blue-600' },
  { name: 'Servicios',      href: '/servicios',         icon: Sparkles,      color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', activeBg: 'bg-fuchsia-600' },
  { name: 'Inventario',     href: '/inventario',        icon: Boxes,         color: 'text-cyan-600', bg: 'bg-cyan-50', activeBg: 'bg-cyan-600' },
  { name: 'Facturación',    href: '/facturacion',       icon: FileCheck2,    color: 'text-rose-600', bg: 'bg-rose-50', activeBg: 'bg-rose-600' },
  { name: 'Finanzas',       href: '/finanzas',          icon: PieChart,      color: 'text-violet-600', bg: 'bg-violet-50', activeBg: 'bg-violet-600' },
  { name: 'Ventas',         href: '/crm/ventas',        icon: Store,         color: 'text-orange-500', bg: 'bg-orange-50', activeBg: 'bg-orange-500' },
  { name: 'Bitácora',       href: '/bitacora',          icon: Activity,      color: 'text-red-500', bg: 'bg-red-50', activeBg: 'bg-red-500' },
  { name: 'Reportes',       href: '/crm/reportes',      icon: TrendingUp,    color: 'text-lime-600', bg: 'bg-lime-50', activeBg: 'bg-lime-600' },
  { name: 'Usuarios',       href: '/usuarios',          icon: Users,         color: 'text-sky-600', bg: 'bg-sky-50', activeBg: 'bg-sky-600' },
  { name: 'Ajustes',        href: '/crm/configuracion', icon: Settings,      color: 'text-slate-700', bg: 'bg-slate-100', activeBg: 'bg-slate-700' },
];

const SUB_LINKS: Record<string, { label: string; href: string, exact?: boolean }[]> = {
  'Calendario': [
    { label: 'Vista Semana', href: '/?view=week', exact: true },
    { label: 'Vista Día', href: '/?view=day' },
    { label: 'Vista Mes', href: '/?view=month' },
    { label: 'Sucursal Matriz', href: '/?branch=Matriz' },
    { label: 'Sucursal Valle', href: '/?branch=Valle' },
  ],
  'Bandeja': [
    { label: 'Todas las conversaciones', href: '/crm/chat', exact: true },
    { label: 'Asignadas a mí', href: '/crm/chat?filter=mine' },
    { label: 'Sin asignar', href: '/crm/chat?filter=unassigned' },
    { label: 'WhatsApp', href: '/crm/chat?channel=whatsapp' },
    { label: 'Instagram DM', href: '/crm/chat?channel=instagram' },
    { label: 'Facebook', href: '/crm/chat?channel=facebook' },
  ],
  'Contactos': [
    { label: 'Todos los contactos', href: '/crm/contactos', exact: true },
    { label: 'Etiquetas', href: '/crm/contactos?tab=tags' },
    { label: 'Segmentos', href: '/crm/contactos?tab=segments' },
  ],
  'Servicios': [
    { label: 'Todos los servicios', href: '/servicios', exact: true },
    { label: 'Por Categoría', href: '/servicios?tab=categorias' },
    { label: 'Precios', href: '/servicios?tab=precios' },
  ],
  'Inventario': [
    { label: 'Productos', href: '/inventario', exact: true },
    { label: 'Entregas', href: '/inventario/entregas' },
    { label: 'Estadísticas', href: '/inventario/estadisticas' },
    { label: 'Finanzas Inventario', href: '/inventario/finanzas' },
  ],
  'Facturación': [
    { label: 'Todas las facturas', href: '/facturacion', exact: true },
    { label: 'Pendientes', href: '/facturacion?status=pending' },
    { label: 'Pagadas', href: '/facturacion?status=paid' },
    { label: 'Anuladas', href: '/facturacion?status=void' },
  ],
  'Finanzas': [
    { label: 'Resumen General', href: '/finanzas', exact: true },
    { label: 'Ingresos', href: '/finanzas?tab=ingresos' },
    { label: 'Egresos', href: '/finanzas?tab=egresos' },
    { label: 'Balance', href: '/finanzas?tab=balance' },
  ],
  'Embudos': [
    { label: 'Vista Kanban', href: '/crm/embudos', exact: true },
    { label: 'Vista Lista', href: '/crm/embudos?view=list' },
  ],
  'Bots': [
    { label: 'Flujos Visuales', href: '/crm/chatbots', exact: true },
    { label: 'Mensajes Programados', href: '/crm/chatbots?tab=scheduled' },
  ],
  'IA & Auto': [
    { label: 'Reglas Inteligentes', href: '/crm/automatizacion', exact: true },
    { label: 'Asistentes MIA', href: '/crm/asistentes' },
    { label: 'Configuración IA', href: '/crm/chatbots?tab=mia' },
  ],
  'Ventas': [
    { label: 'Catálogo de Productos', href: '/crm/ventas', exact: true },
    { label: 'Historial de Pedidos', href: '/crm/ventas?tab=orders' },
  ],
  'Bitácora': [
    { label: 'Registro Completo', href: '/bitacora', exact: true },
    { label: 'Por Usuario', href: '/bitacora?filter=user' },
    { label: 'Por Fecha', href: '/bitacora?filter=date' },
    { label: 'Por Módulo', href: '/bitacora?filter=module' },
  ],
  'Reportes': [
    { label: 'Dashboard General', href: '/crm/reportes', exact: true },
    { label: 'Gestión por Agente', href: '/crm/reportes?tab=agents' },
    { label: 'Análisis de Ventas', href: '/crm/reportes?tab=sales' },
  ],
  'Usuarios': [
    { label: 'Todos los usuarios', href: '/usuarios', exact: true },
    { label: 'Roles y Permisos', href: '/usuarios?tab=roles' },
    { label: 'Activos', href: '/usuarios?status=active' },
    { label: 'Inactivos', href: '/usuarios?status=inactive' },
  ],
  'Ajustes': [
    { label: 'Apariencia y Sistema', href: '/crm/configuracion', exact: true },
    { label: 'Conexiones Meta', href: '/crm/configuracion#meta' },
    { label: 'Equipo y Roles', href: '/crm/configuracion#agents' },
    { label: 'Integraciones', href: '/crm/configuracion#integrations' },
  ]
};

const CTA_CONFIG: Record<string, { label: string; href: string }> = {
  '/':                  { label: 'Nueva Cita',         href: '/?new=1' },
  '/crm/chat':          { label: 'Nuevo Mensaje',      href: '/crm/chat' },
  '/crm/chatbots':      { label: 'Crear Chatbot',      href: '/crm/chatbots?new=1' },
  '/crm/ventas':        { label: 'Nuevo Producto',     href: '/crm/ventas?new=1' },
  '/crm/automatizacion':{ label: 'Nueva Regla',        href: '/crm/automatizacion?new=1' },
  '/crm/embudos':       { label: 'Nuevo Embudo',       href: '/crm/embudos?new=1' },
  '/crm/contactos':     { label: 'Nuevo Contacto',     href: '/crm/contactos?new=1' },
  '/crm/campanas':      { label: 'Nueva Campaña',      href: '/crm/campanas?new=1' },
  '/crm/reportes':      { label: 'Exportar Datos',     href: '/crm/reportes?export=1' },
  '/servicios':         { label: 'Nuevo Servicio',     href: '/servicios?new=1' },
  '/inventario':        { label: 'Agregar Producto',   href: '/inventario?new=1' },
  '/facturacion':       { label: 'Nueva Factura',      href: '/facturacion?new=1' },
  '/usuarios':          { label: 'Nuevo Usuario',      href: '/usuarios?new=1' },
};

// ─── Main Layout ────────────────────────────────────────────────────────────
export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<string[]>([]);
  
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleProfileUpdate = async (data: Partial<User>) => {
    if (!user) return;
    try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, data);
        updateUser(data);
        toast({ title: "Perfil Actualizado" });
        setIsProfileOpen(false);
    } catch (e) {
        toast({ title: "Error", variant: "destructive" });
    }
  };

  // Live unread badge
  useEffect(() => {
    const q = query(collection(db, 'crm_chats'), where('unreadCount', '>', 0));
    const unsub = onSnapshot(q, snap => setUnreadCount(snap.size));
    return () => unsub();
  }, []);

  // Live low-stock badge
  useEffect(() => {
    const q = query(collection(db, 'inventory'));
    const unsub = onSnapshot(q, snap => {
      const low = snap.docs.filter(doc => {
        const d = doc.data();
        const stock = typeof d.stock === 'number' ? d.stock : 0;
        const minStock = typeof d.minStock === 'number' ? d.minStock : 5;
        return stock <= minStock;
      });
      setLowStockCount(low.length);
      setLowStockItems(low.map(d => d.data().name || 'Producto').slice(0, 3));
    }, () => {});
    return () => unsub();
  }, []);

  const activeModule = APP_MODULES.find(m => 
    m.href === '/' ? pathname === '/' : pathname.startsWith(m.href)
  ) || APP_MODULES[0];

  // Estado local para actualizar col 2 INSTANTÁNEAMENTE al hacer clic
  const [selectedModule, setSelectedModule] = useState(activeModule);

  // Si el pathname cambia (ej: atrás/adelante del browser), sincroniza
  useEffect(() => {
    setSelectedModule(activeModule);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] w-full font-sans">

      {/* ══ COLUMNA 1: RAIL DE ICONOS (siempre fija, 60px) ═══════════════════════ */}
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-[52px] flex flex-col bg-[var(--bg-white)] border-r border-[var(--border-light)] shadow-sm">
        {/* LOGO */}
        <div className="h-[50px] shrink-0 border-b border-[var(--border-light)] flex items-center justify-center">
          <Link
            href="/crm/chat"
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-[15px] text-white shadow-md bg-gradient-to-br from-[#eb2f96] to-indigo-600 transition-transform hover:scale-105"
            title="Élapiel CRM"
          >
            É
          </Link>
        </div>

        {/* ICONOS DE MÓDULOS */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden py-1 flex flex-col items-center gap-px"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {APP_MODULES.filter(module => {
            if (!user) return false;
            if (user.role === 'administrador') return true;

            let permKey = module.name.toLowerCase();
            if (['bandeja', 'embudos', 'bots', 'ventas', 'ajustes', 'ia & auto'].includes(permKey)) permKey = 'crm';
            if (permKey === 'contactos') permKey = 'clientes';
            if (permKey === 'facturación') permKey = 'facturacion';
            if (permKey === 'bitácora') permKey = 'bitacora';

            const modulePerms = (user.permissions as any)?.[permKey];
            if (modulePerms !== undefined) {
               return modulePerms?.ver === true;
            }
            
            return ['Calendario', 'Inventario', 'Contactos', 'IA & Auto'].includes(module.name);
          }).map(module => {
            const isModuleActive = module.href === '/'
              ? pathname === '/'
              : pathname.startsWith(module.href);
            const showBadge = module.name === 'Bandeja' && unreadCount > 0;
            const showLowStock = module.name === 'Inventario' && lowStockCount > 0;

            return (
              <Link
                key={module.href}
                href={module.href}
                title={module.name}
                onClick={() => setSelectedModule(module)}
                className={cn(
                  "group relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
                  (selectedModule.href === module.href)
                    ? cn("shadow-sm", module.bg)
                    : "text-[#8a9bb2] hover:bg-slate-100 hover:text-[#5e6e82]"
                )}
              >
                <module.icon
                  className={cn("w-[20px] h-[20px] transition-transform duration-300 group-hover:scale-[1.15]", (selectedModule.href === module.href) ? module.color : "")}
                  strokeWidth={(selectedModule.href === module.href) ? 2.2 : 1.5}
                />
                {/* Indicator dot */}
                {(selectedModule.href === module.href) && (
                  <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full", module.activeBg)} />
                )}
                {/* Badge — unread messages */}
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-[12px] h-[12px] bg-[#eb2f96] text-white text-[7px] font-black rounded-full flex items-center justify-center shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {/* Badge — low stock alert */}
                {showLowStock && (
                  <span
                    title={`Stock bajo: ${lowStockItems.join(', ')}${lowStockCount > 3 ? ` y ${lowStockCount - 3} más` : ''}`}
                    className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[7px] font-black rounded-full flex items-center justify-center shadow-md border border-white animate-pulse"
                  >
                    {lowStockCount > 9 ? '9+' : lowStockCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

      </aside>

      {/* ══ MAIN CONTENT AREA ═══════════════════════════════════════════════ */}
      <main className="flex-1 overflow-hidden relative min-w-0 flex flex-col w-full h-full ml-[52px] bg-[var(--bg-app)]">

        {/* Top Header Bar */}
        <header className="h-[50px] bg-[var(--bg-white)] border-b border-[var(--border-light)] flex items-center px-5 gap-4 shrink-0 z-10 transition-colors">
          <div className="flex items-center gap-2">
            <activeModule.icon className={cn("w-4 h-4", activeModule.color)} strokeWidth={2.5} />
            <span className="font-bold text-[14px] text-[color:var(--text-primary)] tracking-tight">
              {activeModule.name}
            </span>
            <span className="text-[11px] text-[color:var(--text-secondary)] font-normal hidden md:block">/ Dashboard Administrativo</span>
          </div>

          <div className="flex-1" />

          {/* Top Right Actions */}
          <div className="flex items-center gap-3">
            <GlobalSearch />

            <NotificationBell />

            <Link href="/crm/configuracion">
              <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <Settings className="w-5 h-5" />
              </button>
            </Link>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            {/* User avatar & Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-xl border-2 border-primary/30 hover:border-primary transition-all p-0 overflow-hidden bg-background shadow-md group">
                      <Avatar className="h-full w-full rounded-xl">
                        <AvatarImage src={user.photoUrl || ''} className="object-cover rounded-xl" />
                        <AvatarFallback className="bg-background text-primary font-black text-xs rounded-xl" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white' }}>
                          {user.name?.split(' ').map(n=>n[0]).join('').toUpperCase() || 'OP'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-xl" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                          <p className="text-sm font-black  leading-none">{user.name}</p>
                          <p className="text-[10px] leading-none text-muted-foreground font-normal">{user.email}</p>
                      </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer font-normal text-xs ">
                    <UserCog className="mr-2 h-4 w-4" />
                    Editar Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive font-normal text-xs ">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Inner Page Content */}
        <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-slate-900/50 relative">
          {children}
        </div>

        <FloatingChat />
        {user && (
          <ProfileFormDialog 
              isOpen={isProfileOpen}
              onOpenChange={setIsProfileOpen}
              user={user}
              onSubmit={handleProfileUpdate}
          />
        )}
      </main>
    </div>
  );
}
