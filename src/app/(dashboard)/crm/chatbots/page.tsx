"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  MessageCircle, 
  Workflow,
  Settings,
  MoreVertical,
  Activity,
  Zap,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatbotConfig } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function ChatbotGridPage() {
  const [bots, setBots] = useState<ChatbotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, 'crm_chatbots'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveBots = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as ChatbotConfig));
      setBots(liveBots);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateBot = async () => {
    const newBot = {
      name: `Nuevo Chatbot ${bots.length + 1}`,
      description: "Bot automatizado por defecto",
      active: false,
      aiFallback: false,
      triggerKeywords: ["hola", "info"],
      assignedWaId: "",
      nodes: [],
      edges: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      const docRef = await addDoc(collection(db, 'crm_chatbots'), newBot);
      router.push(`/crm/chatbots/${docRef.id}`);
    } catch (e) {
      console.error("Error creating bot", e);
    }
  };

  const toggleBotStatus = async (botId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'crm_chatbots', botId), {
        active: !currentStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error toggling status", error);
    }
  };

  const handleImportElapiel = async () => {
    setIsImporting(true);
    try {
      const res = await fetch('/api/crm/seed-bot', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        router.push(`/crm/chatbots/${data.id}`);
      } else {
        console.error('Error importando bot:', data.error);
        alert('Error al importar el flujo. Revisa la consola.');
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header Wasapi Style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#111b21] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-[#25D366]/10 text-[#25D366] rounded-xl flex items-center justify-center">
                 <MessageCircle className="w-6 h-6" />
              </div>
              Mis Chatbots
           </h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
             Crea y gestiona flujos automatizados para WhatsApp.
           </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button 
            onClick={handleImportElapiel} 
            disabled={isImporting}
            variant="outline"
            className="border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/10 font-semibold px-4 rounded-xl h-11"
          >
            <Download className="w-4 h-4 mr-2" />
            {isImporting ? 'Importando...' : 'Importar Flujo Élapiel 🪄'}
          </Button>
          <Button 
            onClick={() => router.push('/crm/automatizacion')}
            variant="outline"
            className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 font-semibold px-4 rounded-xl h-11"
          >
            <Zap className="w-4 h-4 mr-2" />
            Ver Reglas Automáticas
          </Button>
          <Button onClick={handleCreateBot} className="bg-[#25D366] hover:bg-[#1da851] text-white font-semibold shadow-md px-6 rounded-xl h-11">
             <Plus className="w-5 h-5 mr-2" /> Crear Flujo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
           <div className="w-8 h-8 rounded-full border-t-2 border-[#25D366] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {bots.map((bot) => (
             <Card key={bot.id} className="bg-white dark:bg-[#111b21] border-slate-200 dark:border-slate-800 hover:border-[#25D366]/50 dark:hover:border-[#25D366]/50 transition-all overflow-hidden group shadow-sm rounded-2xl">
               <CardContent className="p-0">
                  <div className="p-6 relative">
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366]">
                           <Workflow className="w-6 h-6" />
                        </div>
                        <Switch 
                           checked={bot.active} 
                           onCheckedChange={() => toggleBotStatus(bot.id, bot.active)}
                           className={cn("data-[state=checked]:bg-[#25D366]")}
                        />
                     </div>
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                        {bot.name}
                     </h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[40px]">
                        {bot.description || 'Sin descripción'}
                     </p>
                  </div>
                  
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3 border-y border-slate-100 dark:border-slate-800/50">
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-slate-500 font-medium flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" /> Disparadores:
                       </span>
                       <div className="flex gap-1 max-w-[120px] overflow-hidden flex-wrap justify-end">
                         {bot.triggerKeywords && bot.triggerKeywords.length > 0 ? (
                            bot.triggerKeywords.slice(0,2).map(kw => (
                               <span key={kw} className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-medium">#{kw}</span>
                            ))
                         ) : (
                            <span className="text-slate-400 text-xs">Todos</span>
                         )}
                         {bot.triggerKeywords && bot.triggerKeywords.length > 2 && (
                            <span className="text-slate-400 text-[10px] px-1">+{bot.triggerKeywords.length - 2}</span>
                         )}
                       </div>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-slate-500 font-medium flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-500" /> Nodos:
                       </span>
                       <span className="text-slate-700 dark:text-slate-300 font-semibold">
                         {bot.nodes?.length || 0}
                       </span>
                     </div>
                  </div>

                  <div className="p-4 flex items-center justify-between bg-white dark:bg-[#111b21]">
                     <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <Settings className="w-5 h-5" />
                     </Button>
                     <Button className="bg-slate-100 dark:bg-slate-800 hover:bg-[#25D366] hover:text-white text-slate-700 dark:text-slate-200 font-semibold rounded-xl" asChild>
                        <Link href={`/crm/chatbots/${bot.id}`}>
                           Editar Flujo <Workflow className="w-4 h-4 ml-2" />
                        </Link>
                     </Button>
                  </div>
               </CardContent>
             </Card>
           ))}
           
           {bots.length === 0 && (
             <div className="col-span-full py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center bg-white dark:bg-[#111b21]/50">
                <div className="w-16 h-16 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center mb-4">
                   <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No tienes flujos todavía</h3>
                <p className="text-slate-500 max-w-sm mb-6">
                  Crea tu primer chatbot para automatizar respuestas en WhatsApp y mejorar el tiempo de atención.
                </p>
                <Button onClick={handleCreateBot} className="bg-[#25D366] hover:bg-[#1da851] text-white font-semibold shadow-md px-8 rounded-xl h-12">
                   <Plus className="w-5 h-5 mr-2" /> Crear mi primer Flujo
                </Button>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
