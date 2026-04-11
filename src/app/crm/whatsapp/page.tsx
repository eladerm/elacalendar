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
        case 'GREEN': return <span className="text-emerald-500 font-black flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Alta</span>;
        case 'YELLOW': return <span className="text-yellow-500 font-black flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Media</span>;
        case 'RED': return <span className="text-red-500 font-black flex items-center gap-1"><X className="w-3 h-3"/> Baja / Riesgo</span>;
        default: return <span className="text-slate-500">Desconocida</span>;
     }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-emerald-500" />
              Gestor de Líneas WhatsApp
           </h1>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                 Meta Cloud API
              </span>
           </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsConnectModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-6 rounded-xl h-11">
             <Plus className="w-4 h-4 mr-2" /> Agregar Número de Teléfono
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
           <div className="w-8 h-8 rounded-full border-t-2 border-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
           {channels.map((chan) => (
             <Card key={chan.id} className="bg-[#1e293b]/40 border-slate-700/50 hover:border-emerald-500/30 transition-all overflow-hidden relative">
               <CardContent className="p-0">
                  <div className="p-6 border-b border-slate-700/50 flex items-start gap-4">
                     <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shrink-0">
                       <MessageSquare className="w-6 h-6 text-emerald-500" />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <h3 className="text-xl font-black text-white tracking-widest truncate">{chan.phoneNumber}</h3>
                           {chan.verified && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase truncate mt-1">
                          {chan.name}
                        </p>
                     </div>
                  </div>
                  
                  <div className="p-5 bg-slate-900/50 grid grid-cols-2 gap-4 border-b border-slate-700/50">
                     <div className="space-y-1">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                           <Activity className="w-3 h-3" /> Salud (Health)
                        </span>
                        <div className="text-sm uppercase tracking-widest">
                           {renderHealthScore(chan.healthScore)}
                        </div>
                     </div>
                     <div className="space-y-1">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                           <MessageSquare className="w-3 h-3" /> Límite Diario
                        </span>
                        <div className="text-sm font-black text-white uppercase tracking-widest">
                           {chan.messagingLimit} Msjs
                        </div>
                     </div>
                  </div>

                  <div className="p-4 flex items-center justify-between bg-slate-900/80">
                     <div className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", chan.status === 'CONNECTED' ? "bg-emerald-400" : "bg-red-400")} />
                        {chan.status === 'CONNECTED' ? 'Conectado a la Nube' : 'Desconectado'}
                     </div>
                     <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
               </CardContent>
            </Card>
           ))}
           
           {channels.length === 0 && (
             <div className="col-span-full p-12 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-center">
                <Smartphone className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-xl font-black text-white italic uppercase mb-2">Sin Líneas Conectadas</h3>
                <p className="text-slate-400 font-bold text-sm uppercase max-w-sm mb-6">
                  Conecta tu primera línea de WhatsApp Business nativa para recibir mensajes y permitir la acción del CRM.
                </p>
                <Button onClick={() => setIsConnectModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-8 rounded-xl h-12">
                   <Plus className="w-5 h-5 mr-2" /> Agregar Número de Teléfono
                </Button>
             </div>
           )}
        </div>
      )}

      {/* Modal / Wizard de Onboarding */}
      <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogContent className="sm:max-w-xl bg-[#0f172a] border-slate-700 text-white p-0 overflow-hidden shadow-2xl">
          <div className="bg-emerald-500/10 p-6 border-b border-emerald-500/20">
             <DialogHeader>
               <DialogTitle className="text-xl font-black italic uppercase text-emerald-400">¿Qué te gustaría hacer?</DialogTitle>
               <DialogDescription className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
                 Elige la opción que mejor se adapte a tus necesidades al momento de conectar tu línea. Todo es un proceso oficial avalado por Meta.
               </DialogDescription>
             </DialogHeader>
          </div>
          
          <div className="p-6 space-y-4">
             {/* Opción 1: Migrar cuenta actual */}
             <button 
                onClick={() => handleCreateMockChannel('migrated')}
                className="w-full text-left p-5 rounded-2xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-emerald-500/50 transition-all group flex items-start gap-4"
             >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                   <MessageSquare className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                   <h4 className="text-white font-black uppercase text-sm mb-1 group-hover:text-emerald-400 transition-colors">
                      Usar mi cuenta actual de WhatsApp Business
                   </h4>
                   <p className="text-slate-400 text-xs font-medium leading-relaxed">
                      Ya tengo una cuenta de WhatsApp Business y quiero usarla. Modo Híbrido: Recibirás mensajes tanto en tu celular físico como en este CRM.
                   </p>
                </div>
             </button>

             {/* Opción 2: Línea Nueva (Cloud) */}
             <button 
                onClick={() => handleCreateMockChannel('new_cloud')}
                className="w-full text-left p-5 rounded-2xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:emerald-500/50 transition-all group flex items-start gap-4"
             >
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                   <Smartphone className="w-5 h-5 text-slate-300 group-hover:text-white" />
                </div>
                <div>
                   <h4 className="text-white font-black uppercase text-sm mb-1 group-hover:text-emerald-400 transition-colors">
                      Conectar una línea nueva a Wasapi
                   </h4>
                   <p className="text-slate-400 text-xs font-medium leading-relaxed">
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
