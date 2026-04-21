"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Smartphone, 
  Activity, 
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  MessageSquare
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WhatsAppChannel } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function WhatsAppChannelsPage() {
  const [channels, setChannels] = useState<WhatsAppChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'crm_whatsapp_channels'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveChannels = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as WhatsAppChannel));
      setChannels(liveChannels);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateMockChannel = async (type: 'migrated' | 'new_cloud') => {
    const newChan: Partial<WhatsAppChannel> = {
      name: "Élapiel Corporativo",
      phoneNumber: `+593 99 ${Math.floor(100+Math.random()*899)} ${Math.floor(1000+Math.random()*8999)}`,
      type: type,
      healthScore: 'GREEN',
      qualityRating: 'Alta',
      messagingLimit: '250',
      status: 'CONNECTED',
      verified: true,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    try {
      await addDoc(collection(db, 'crm_whatsapp_channels'), newChan);
      setIsConnectModalOpen(false);
    } catch (e) {
      console.error("Error linking channel", e);
    }
  };

  const renderHealthScore = (score: string) => {
     switch(score) {
        case 'GREEN': return <span className="text-primary font-black flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Alta</span>;
        case 'YELLOW': return <span className="text-yellow-500 font-black flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Media</span>;
        case 'RED': return <span className="text-destructive font-black flex items-center gap-1"><X className="w-3 h-3"/> Baja / Riesgo</span>;
        default: return <span className="text-muted-foreground">Desconocida</span>;
     }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-foreground italic uppercase flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-primary" />
              Gestor de Líneas WhatsApp
           </h1>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest bg-muted px-3 py-1 rounded-lg border border-border">
                 Meta Cloud API
              </span>
           </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsConnectModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 px-6 rounded-xl h-11">
             <Plus className="w-4 h-4 mr-2" /> Agregar Número de Teléfono
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
           <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
           {channels.map((chan) => (
             <Card key={chan.id} className="bg-card border-border hover:border-primary/30 transition-all overflow-hidden relative">
               <CardContent className="p-0">
                  <div className="p-6 border-b border-border flex items-start gap-4">
                     <div className="w-14 h-14 rounded-full bg-muted border-2 border-border flex items-center justify-center shrink-0">
                       <MessageSquare className="w-6 h-6 text-primary" />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <h3 className="text-xl font-black text-foreground tracking-widest truncate">{chan.phoneNumber}</h3>
                           {chan.verified && <ShieldCheck className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground font-bold uppercase truncate mt-1">
                          {chan.name}
                        </p>
                     </div>
                  </div>
                  
                  <div className="p-5 bg-background grid grid-cols-2 gap-4 border-b border-border">
                     <div className="space-y-1">
                        <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                           <Activity className="w-3 h-3" /> Salud (Health)
                        </span>
                        <div className="text-sm uppercase tracking-widest">
                           {renderHealthScore(chan.healthScore)}
                        </div>
                     </div>
                     <div className="space-y-1">
                        <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                           <MessageSquare className="w-3 h-3" /> Límite Diario
                        </span>
                        <div className="text-sm font-black text-foreground uppercase tracking-widest">
                           {chan.messagingLimit} Msjs
                        </div>
                     </div>
                  </div>

                  <div className="p-4 flex items-center justify-between bg-muted">
                     <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", chan.status === 'CONNECTED' ? "bg-primary" : "bg-destructive")} />
                        {chan.status === 'CONNECTED' ? 'Conectado a la Nube' : 'Desconectado'}
                     </div>
                     <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
               </CardContent>
            </Card>
           ))}
           
           {channels.length === 0 && (
             <div className="col-span-full p-12 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
                <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-black text-foreground italic uppercase mb-2">Sin Líneas Conectadas</h3>
                <p className="text-muted-foreground font-bold text-sm uppercase max-w-sm mb-6">
                  Conecta tu primera línea de WhatsApp Business nativa para recibir mensajes y permitir la acción del CRM.
                </p>
                <Button onClick={() => setIsConnectModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 px-8 rounded-xl h-12">
                   <Plus className="w-5 h-5 mr-2" /> Agregar Número de Teléfono
                </Button>
             </div>
           )}
        </div>
      )}

      {/* Modal / Wizard de Onboarding */}
      <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogContent className="sm:max-w-xl bg-background border-border text-foreground p-0 overflow-hidden shadow-2xl">
          <div className="bg-primary/10 p-6 border-b border-primary/20">
             <DialogHeader>
               <DialogTitle className="text-xl font-black italic uppercase text-primary">¿Qué te gustaría hacer?</DialogTitle>
               <DialogDescription className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2">
                 Elige la opción que mejor se adapte a tus necesidades al momento de conectar tu línea. Todo es un proceso oficial avalado por Meta.
               </DialogDescription>
             </DialogHeader>
          </div>
          
          <div className="p-6 space-y-4">
             {/* Opción 1: Migrar cuenta actual */}
             <button 
                onClick={() => handleCreateMockChannel('migrated')}
                className="w-full text-left p-5 rounded-2xl border border-border bg-muted/50 hover:bg-muted hover:border-primary/50 transition-all group flex items-start gap-4"
             >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                   <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                   <h4 className="text-foreground font-black uppercase text-sm mb-1 group-hover:text-primary transition-colors">
                      Usar mi cuenta actual de WhatsApp Business
                   </h4>
                   <p className="text-muted-foreground text-xs font-medium leading-relaxed">
                      Ya tengo una cuenta de WhatsApp Business y quiero usarla. Modo Híbrido: Recibirás mensajes tanto en tu celular físico como en este CRM.
                   </p>
                </div>
             </button>

             {/* Opción 2: Línea Nueva (Cloud) */}
             <button 
                onClick={() => handleCreateMockChannel('new_cloud')}
                className="w-full text-left p-5 rounded-2xl border border-border bg-muted/50 hover:bg-muted hover:border-primary/50 transition-all group flex items-start gap-4"
             >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                   <Smartphone className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                </div>
                <div>
                   <h4 className="text-foreground font-black uppercase text-sm mb-1 group-hover:text-primary transition-colors">
                      Conectar una línea nueva a Wasapi
                   </h4>
                   <p className="text-muted-foreground text-xs font-medium leading-relaxed">
                      Quiero conectar una nueva línea de teléfono. Ésta línea existirá virtualmente solo en este CRM (Soportado por Cloud API).
                   </p>
                </div>
             </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
