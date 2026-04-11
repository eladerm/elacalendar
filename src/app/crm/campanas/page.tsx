"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Megaphone, 
  Search, 
  Plus, 
  Send,
  Users,
  CheckCircle2,
  Clock,
  LayoutTemplate
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Campaign = {
    id: string;
    name: string;
    targetTag: string; // e.g. "VIP", "Láser"
    template: string;
    status: 'Enviado' | 'Borrador' | 'En Progreso';
    sentCount: number;
    createdAt: any;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', targetTag: '', template: '' });

  useEffect(() => {
    const q = query(collection(db, 'crm_campaigns'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as Campaign));
      setCampaigns(liveData);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, 'crm_campaigns'), {
            name: newCampaign.name,
            targetTag: newCampaign.targetTag,
            template: newCampaign.template,
            status: 'En Progreso',
            sentCount: 0,
            createdAt: serverTimestamp()
        });
        setIsNewModalOpen(false);
        setNewCampaign({ name: '', targetTag: '', template: '' });
    } catch(err) {
        console.error("Error creating campaign", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-emerald-500" />
              Difusión y Marketing
           </h1>
           <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">
              {campaigns.length} Campañas lanzadas en tu nube oficial.
           </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsNewModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-6 rounded-xl h-11">
             <Plus className="w-4 h-4 mr-2" /> Lanzar Nueva Campaña
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <Card className="bg-[#1e293b]/40 border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/50">
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest pl-6">Campaña</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Audiencia Filtro (Tag)</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Plantilla Base</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right pr-6">Alcanzados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                        <div className="w-8 h-8 rounded-full border-t-2 border-emerald-500 animate-spin mx-auto" />
                    </td>
                  </tr>
              ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                       No existen campañas de Marketing corriendo.
                    </td>
                  </tr>
              ) : campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 pl-6 font-black text-white">{camp.name}</td>
                  <td className="p-4">
                      <span className="bg-slate-800 py-1 px-3 text-[10px] font-black uppercase text-emerald-400 rounded-full border border-emerald-500/30">
                        {camp.targetTag}
                      </span>
                  </td>
                  <td className="p-4 font-bold text-sm text-slate-400 flex items-center gap-2">
                     <LayoutTemplate className="w-4 h-4" /> {camp.template}
                  </td>
                  <td className="p-4">
                      <span className={cn(
                          "py-1 px-2.5 text-[10px] font-black uppercase rounded-lg border",
                          camp.status === 'En Progreso' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                      )}>
                          {camp.status}
                      </span>
                  </td>
                  <td className="p-4 pr-6 text-right font-black text-white text-lg">
                      {camp.sentCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL CREAR CAMPAÑA */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#0f172a] border-slate-700 text-white p-0 overflow-hidden">
          <div className="bg-emerald-500/10 p-6 border-b border-emerald-500/20">
             <DialogHeader>
               <DialogTitle className="text-xl font-black italic uppercase text-emerald-400">Preparar Disparo</DialogTitle>
             </DialogHeader>
          </div>
          <form onSubmit={handleLaunchCampaign} className="p-6 space-y-4">
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nombre de Campaña (Interno)</label>
                 <Input required value={newCampaign.name} onChange={e=>setNewCampaign({...newCampaign, name: e.target.value})} className="bg-slate-900 border-slate-700 font-bold" placeholder="Ej. Promoción Madres" />
             </div>
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400">Audiencia (Etiqueta Exacta)</label>
                 <Input required value={newCampaign.targetTag} onChange={e=>setNewCampaign({...newCampaign, targetTag: e.target.value})} className="bg-slate-900 border-slate-700 font-bold" placeholder="Ej. VIP" />
             </div>
             <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400">Plantilla Autorizada</label>
                 <select required className="flex h-10 w-full rounded-md border text-sm font-bold bg-slate-900 border-slate-700 p-2" onChange={e=>setNewCampaign({...newCampaign, template: e.target.value})} value={newCampaign.template}>
                     <option value="" disabled>Selecciona una plantilla oficial de Meta...</option>
                     <option value="promo_madres_1">promo_madres_1</option>
                     <option value="reserva_recordatorio_24h">reserva_recordatorio_24h</option>
                     <option value="bienvenida_oficial">bienvenida_oficial</option>
                 </select>
             </div>
             <div className="pt-4 flex justify-end gap-2">
                 <Button type="button" variant="ghost" onClick={() => setIsNewModalOpen(false)}>Cancelar</Button>
                 <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase"> <Send className="w-4 h-4 mr-2"/> Disparar Campaña</Button>
             </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
