
"use client";

import Link from 'next/link';
import { Button } from './ui/button';
import { Plus, LogOut, User as UserIcon, Calendar, Users, Briefcase, FileText, BarChart2, Package } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from 'react';
import { ProfileFormDialog } from './profile-form-dialog';
import type { User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const navLinks = [
  { href: "/", icon: Calendar, label: "Calendario", key: 'calendario' },
  { href: "/clientes", icon: Users, label: "Clientes", key: 'clientes' },
  { href: "/inventario", icon: Package, label: "Inventario", key: 'inventario' },
  { href: "/servicios", icon: Briefcase, label: "Servicios", key: 'servicios' },
  { href: "/usuarios", icon: UserIcon, label: "Usuarios", key: 'usuarios' },
  { href: "/bitacora", icon: FileText, label: "Bitácora", key: 'bitacora' },
  { href: "/reportes", icon: BarChart2, label: "Reportes", key: 'reportes' },
];

interface SiteHeaderProps {
  onAddNewClick?: () => void;
  secondaryAction?: React.ReactNode;
}

export function SiteHeader({ onAddNewClick, secondaryAction }: SiteHeaderProps) {
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
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

  const visibleLinks = useMemo(() => {
    if (!user) return [];
    
    // Si es Administrador General, tiene acceso a TODO por defecto
    if (user.role === 'administrador') return navLinks;

    const isBranchAdmin = user.role === 'administrador_sucursal';

    return navLinks.filter(link => {
        // Bitácora solo para administradores (Gral o Sucursal)
        if (link.key === 'bitacora') return isBranchAdmin;

        // Verificación de permisos por módulo
        const modulePerms = (user.permissions as any)?.[link.key];
        
        // Si es Gerente de Sucursal y no tiene el objeto de permisos (compatibilidad), 
        // le damos acceso a lo básico excepto gestión de usuarios y reportes globales
        if (!user.permissions && isBranchAdmin) {
            return !['usuarios', 'bitacora'].includes(link.key);
        }

        // Caso estándar: Basado en el check de "ver" del módulo
        return modulePerms?.ver === true;
    });
  }, [user]);

  const firstName = useMemo(() => {
    if (!user?.name) return '';
    const name = user.name.split(' ')[0].toLowerCase();
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [user?.name]);

  const initials = useMemo(() => {
    if (!user?.name) return '';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  }, [user?.name]);

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md shadow-sm">
      <div className="flex h-16 items-center justify-between px-2 sm:px-6">
        <div className="flex gap-2 md:gap-8 items-center">
          <Link href="/" className="flex items-center space-x-2 mr-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-md shadow-primary/20">
                <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-primary-foreground"
                >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
            </div>
            <span className="hidden sm:inline-block font-black text-xl tracking-tight text-foreground uppercase italic">ÉLAPIEL</span>
          </Link>
          
          <TooltipProvider>
            <nav className="flex items-center gap-1 sm:gap-2">
              {visibleLinks.map(({ href, icon: Icon, label }) => (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      variant="ghost"
                      className={cn(
                        "flex items-center gap-2 border transition-all",
                        isMobile 
                          ? "w-10 h-10 p-0 bg-background shadow-sm border-border/60" 
                          : "px-3 border-transparent hover:border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                      )}
                    >
                      <Link href={href}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden lg:inline font-bold uppercase text-[11px] tracking-wider">{label}</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className={cn(!isMobile && 'hidden')}>
                    {label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </nav>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-3">
           {user && (
             <div className="flex flex-col items-center justify-center pt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/30 hover:border-primary transition-all p-0 overflow-hidden bg-background shadow-md group">
                        <Avatar className="h-full w-full">
                          <AvatarImage src={user.photoUrl || ''} className="object-cover" />
                          <AvatarFallback className="bg-background text-primary font-black text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-black uppercase leading-none">{user.name}</p>
                            <p className="text-[10px] leading-none text-muted-foreground font-bold">{user.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer font-bold text-xs uppercase">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Editar Mi Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive font-bold text-xs uppercase">
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-[10px] font-black text-primary mt-1 leading-none uppercase italic bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                  {firstName}
                </span>
             </div>
           )}
          {secondaryAction}
        </div>
      </div>
    </header>
    {user && (
        <ProfileFormDialog 
            isOpen={isProfileOpen}
            onOpenChange={setIsProfileOpen}
            user={user}
            onSubmit={handleProfileUpdate}
        />
    )}
    </>
  );
}
