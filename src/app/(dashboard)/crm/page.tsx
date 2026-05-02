"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Clock, 
  ArrowUpRight, 
  LayoutDashboard,
  CheckCircle2,
  CalendarDays,
  Megaphone
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const StatsCard = ({ title, value, icon: Icon, change, isPositive }: any) => (
  <Card className="bg-card border-border hover:bg-accent hover:text-accent-foreground transition-colors relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon className="w-24 h-24" />
    </div>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-foreground">{value}</span>
        {change && (
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive-foreground"
          )}>
            {change}
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function CRMDashboard() {
  const router = useRouter();
  
  const [stats, setStats] = useState({
      totalContacts: 0,
      activeChats: 0,
      campaignsRunning: 0,
      funnelWins: 0
  });

  useEffect(() => {
     // Lector Contactos
     const unsubContacts = onSnapshot(collection(db, 'crm_contacts'), snap => {
         setStats(prev => ({...prev, totalContacts: snap.size}));
     });
     
     // Lector Chats Abiertos
     const unsubChats = onSnapshot(query(collection(db, 'crm_chats'), where('status', '==', 'open')), snap => {
         setStats(prev => ({...prev, activeChats: snap.size}));
     });
     
     // Lector Campañas Activas
     const unsubCamps = onSnapshot(query(collection(db, 'crm_campaigns'), where('status', '==', 'En Progreso')), snap => {
         setStats(prev => ({...prev, campaignsRunning: snap.size}));
     });
     
     // Lector Embudos (Ganados)
     const unsubFunnel = onSnapshot(query(collection(db, 'crm_funnels'), where('stageId', '==', 'closed')), snap => {
         // Contar cuantas cards están en la etapa 'closed'
         let wins = 0;
         snap.docs.forEach(doc => {
             const data = doc.data();
             if (data.cards) wins += Object.keys(data.cards).length;
         });
         setStats(prev => ({...prev, funnelWins: wins}));
     });

     return () => { unsubContacts(); unsubChats(); unsubCamps(); unsubFunnel(); };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-8">
      
      {/* HEADER DE BIENVENIDA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 to-background p-8 rounded-3xl border border-primary/20 px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <LayoutDashboard className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-primary/30 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Sistema en Línea
            </span>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
               <CalendarDays className="w-3 h-3" /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground italic uppercase tracking-tight">
             Dashboard Principal
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-bold uppercase tracking-widest max-w-xl leading-relaxed">
            Bienvenido al Centro de Control. Monitorea prospectos, atiende chats híbridos y despliega la automatización IA desde un solo lugar.
          </p>
        </div>
        <div className="flex gap-3 relative z-10">
          <Button onClick={()=>router.push('/crm/contactos')} className="bg-primary hover:opacity-90 text-primary-foreground font-black shadow-lg shadow-primary/20 px-6 rounded-xl h-12 uppercase tracking-wider text-xs">
            Nuevo Lead <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Directorio de Contactos" 
          value={stats.totalContacts} 
          icon={Users}
          change="+12% Semana" 
          isPositive={true}
        />
        <StatsCard 
          title="Chats Atendiendo" 
          value={stats.activeChats} 
          icon={MessageCircle} 
          change="Híbrido IA" 
          isPositive={true}
        />
        <StatsCard 
          title="Campañas Activas" 
          value={stats.campaignsRunning} 
          icon={Megaphone} 
          change="Difusión Masiva" 
          isPositive={true}
        />
        <StatsCard 
          title="Ventas Ganadas" 
          value={stats.funnelWins} 
          icon={TrendingUp} 
          change="Kanban" 
          isPositive={true}
        />
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-card border-border hover:bg-accent hover:text-accent-foreground relative overflow-hidden group cursor-pointer" onClick={()=>router.push('/crm/chat')}>
              <CardContent className="p-8">
                 <MessageCircle className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl font-black text-foreground uppercase italic mb-2">Bandeja de Chat</h3>
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Responde a conversaciones pendientes asistidas por IA.</p>
              </CardContent>
          </Card>

          <Card className="bg-card border-border hover:bg-accent hover:text-accent-foreground relative overflow-hidden group cursor-pointer" onClick={()=>router.push('/crm/campanas')}>
              <CardContent className="p-8">
                 <Megaphone className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl font-black text-foreground uppercase italic mb-2">Lanzar Campaña</h3>
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Difusión masiva autorizada por plantillas de Meta.</p>
              </CardContent>
          </Card>

          <Card className="bg-card border-border hover:bg-accent hover:text-accent-foreground relative overflow-hidden group cursor-pointer" onClick={()=>router.push('/crm/contactos')}>
              <CardContent className="p-8">
                 <Users className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl font-black text-foreground uppercase italic mb-2">Agenda Global</h3>
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Añade y etiqueta leads directos a tu embudo.</p>
              </CardContent>
          </Card>

          <Card className="bg-card border-border hover:bg-accent hover:text-accent-foreground relative overflow-hidden group cursor-pointer" onClick={()=>router.push('/crm/automatizacion')}>
              <CardContent className="p-8">
                 <Zap className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl font-black text-foreground uppercase italic mb-2">Automatización</h3>
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Reglas de respuesta rápida por palabras clave.</p>
              </CardContent>
          </Card>
      </div>

    </div>
  );
}
