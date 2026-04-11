"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Bot, Save, ArrowLeft, BrainCircuit, MessageSquare, Clock } from 'lucide-react';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatbotConfig } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

export default function ChatbotConfigPage({ params }: { params: { id: string } }) {
  const [bot, setBot] = useState<ChatbotConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const docRef = doc(db, 'crm_chatbots', params.id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setBot({ id: snapshot.id, ...snapshot.data() } as ChatbotConfig);
      }
    }
    load();
  }, [params.id]);

  const handleSave = async () => {
    if (!bot) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'crm_chatbots', bot.id);
      // Remove id from payload
      const { id, ...data } = bot;
      await updateDoc(docRef, data);
      router.push('/crm/chatbots');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!bot) return <div className="p-12 text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
              <Bot className="w-8 h-8 text-emerald-500" />
              Ajustes - {bot.name}
           </h1>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                 Configuración de IA y Reglas
              </span>
           </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" asChild className="border-slate-700 text-slate-300 font-bold text-xs uppercase h-11 rounded-xl hover:bg-slate-800">
               <Link href="/crm/chatbots"><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Link>
           </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-6 rounded-xl h-11">
             <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-2 space-y-6">
            <Card className="bg-[#1e293b]/60 border-slate-700/50">
               <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-xl font-black text-white uppercase italic">Datos Básicos</CardTitle>
               </CardHeader>
               <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre del Bot</label>
                     <Input 
                        value={bot.name}
                        onChange={e => setBot({...bot, name: e.target.value})}
                        className="bg-slate-900/50 border-slate-700 text-white h-12"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Descripción</label>
                     <Input 
                        value={bot.description || ''}
                        onChange={e => setBot({...bot, description: e.target.value})}
                        className="bg-slate-900/50 border-slate-700 text-white h-12"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Palabras de Activación (Separadas por comas)</label>
                     <Input 
                        value={(bot.triggerKeywords||[]).join(', ')}
                        onChange={e => setBot({...bot, triggerKeywords: e.target.value.split(',').map(s=>s.trim())})}
                        placeholder="ej. información, menú, hola"
                        className="bg-slate-900/50 border-slate-700 text-white h-12"
                     />
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
               <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-xl font-black text-white uppercase italic flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-emerald-500" /> Inteligencia Autónoma (Genkit)
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                    Permitir que la Inteligencia Artificial responda utilizando el conocimiento del negocio si la ruta interactiva falla.
                  </CardDescription>
               </CardHeader>
               <CardContent className="p-6">
                  <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-slate-700/50">
                     <div className="space-y-1">
                        <h4 className="text-sm font-black text-white uppercase">Modo Híbrido (AI Fallback)</h4>
                        <p className="text-xs font-bold text-slate-500 uppercase">Derivar intenciones desconocidas a Gemini/ChatGPT</p>
                     </div>
                     <Switch 
                        checked={bot.aiFallback}
                        onCheckedChange={c => setBot({...bot, aiFallback: c})}
                        className="data-[state=checked]:bg-emerald-500"
                     />
                  </div>
               </CardContent>
            </Card>
         </div>

         <div className="space-y-6">
            <Card className="bg-[#1e293b]/60 border-slate-700/50">
               <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-sm font-black text-white uppercase tracking-widest">Estado</CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                     <span className={cn("text-xs font-black uppercase tracking-widest", bot.active ? "text-emerald-400" : "text-slate-500")}>
                        {bot.active ? 'Bot Operativo' : 'Bot Pausado'}
                     </span>
                     <Switch 
                        checked={bot.active}
                        onCheckedChange={c => setBot({...bot, active: c})}
                        className="data-[state=checked]:bg-emerald-500"
                     />
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-[#1e293b]/60 border-slate-700/50">
               <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-emerald-500" /> Línea Asignada
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                  <Input 
                     value={bot.assignedWaId || ''}
                     onChange={e => setBot({...bot, assignedWaId: e.target.value})}
                     placeholder="ID Teléfono WhatsApp"
                     className="bg-slate-900/50 border-slate-700 text-white text-xs font-bold"
                  />
               </CardContent>
            </Card>

            <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black uppercase shadow-lg h-12 rounded-xl" asChild>
               <Link href={`/crm/chatbots/${bot.id}`}>
                 Entrar al Flow Builder
               </Link>
            </Button>
         </div>
      </div>
    </div>
  );
}
