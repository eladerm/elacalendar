"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  MessageCircle, 
  Workflow,
  Settings,
  Activity,
  Zap,
  Download,
  BrainCircuit,
  Bot
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatbotConfig } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import AssistantGridPage from '../asistentes/page';

export default function ChatbotGridPage() {
  const [bots, setBots] = useState<ChatbotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'flows';

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
      aiFallback: true,
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
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col gap-2">
         <h1 className="text-3xl font-black text-foreground italic uppercase flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            Chatbots Inteligentes
         </h1>
         <p className="text-muted-foreground font-bold text-sm uppercase tracking-tight">
            Gestiona la lógica y el entrenamiento de Gia para WhatsApp.
         </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full space-y-8">
        <div className="flex justify-between items-center border-b border-border pb-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-12">
            <TabsTrigger value="flows" className="rounded-lg px-6 font-black uppercase text-xs tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Workflow className="w-4 h-4 mr-2" /> Flujos
            </TabsTrigger>
            <TabsTrigger value="training" className="rounded-lg px-6 font-black uppercase text-xs tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BrainCircuit className="w-4 h-4 mr-2" /> Entrenamiento (Gia)
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-3">
             <Button 
                onClick={handleImportElapiel} 
                disabled={isImporting}
                variant="outline"
                className="border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-xs tracking-widest px-4 rounded-xl h-11"
              >
                <Download className="w-4 h-4 mr-2" />
                {isImporting ? 'Importando...' : 'Importar Flujo 🪄'}
              </Button>
              <Button onClick={handleCreateBot} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-sm px-6 rounded-xl h-11">
                 <Plus className="w-4 h-4 mr-2" /> Nuevo Flujo
              </Button>
          </div>
        </div>

        <TabsContent value="flows" className="mt-0 outline-none">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
               <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {bots.map((bot) => (
                 <Card key={bot.id} className="bg-card border-border hover:border-primary/50 transition-all overflow-hidden group shadow-sm rounded-2xl">
                   <CardContent className="p-0">
                      <div className="p-6 relative">
                         <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                               <Workflow className="w-6 h-6" />
                            </div>
                            <Switch 
                               checked={bot.active} 
                               onCheckedChange={() => toggleBotStatus(bot.id, bot.active)}
                            />
                         </div>
                         <h3 className="text-lg font-black text-foreground italic uppercase tracking-widest truncate mb-1">
                            {bot.name}
                         </h3>
                         <p className="text-sm text-muted-foreground font-medium line-clamp-2 min-h-[40px]">
                            {bot.description || 'Bot de atención automatizada'}
                         </p>
                      </div>
                      
                      <div className="px-6 py-4 bg-muted/30 flex flex-col gap-3 border-y border-border">
                         <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                           <span className="text-muted-foreground flex items-center gap-2">
                              <Zap className="w-4 h-4 text-amber-500" /> Disparadores:
                           </span>
                           <div className="flex gap-1">
                             {bot.triggerKeywords && bot.triggerKeywords.length > 0 ? (
                                bot.triggerKeywords.slice(0,2).map(kw => (
                                   <span key={kw} className="bg-background border border-border text-foreground px-2 py-0.5 rounded-md">#{kw}</span>
                                ))
                             ) : (
                                <span className="text-muted-foreground">Catch-all</span>
                             )}
                           </div>
                         </div>
                         <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                           <span className="text-muted-foreground flex items-center gap-2">
                              <Activity className="w-4 h-4 text-blue-500" /> Nodos de flujo:
                           </span>
                           <span className="text-foreground">
                             {bot.nodes?.length || 0}
                           </span>
                         </div>
                      </div>

                      <div className="p-4 flex items-center justify-between bg-card">
                         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                            <Settings className="w-5 h-5" />
                         </Button>
                         <Button className="bg-muted hover:bg-primary hover:text-white text-foreground font-black uppercase text-xs tracking-widest rounded-xl transition-all" asChild>
                            <Link href={`/crm/chatbots/${bot.id}`}>
                               Editar Flujo <Workflow className="w-4 h-4 ml-2" />
                            </Link>
                         </Button>
                      </div>
                   </CardContent>
                 </Card>
               ))}
               
               {bots.length === 0 && (
                 <div className="col-span-full py-20 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
                    <Workflow className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-black text-foreground italic uppercase mb-2">Sin flujos activos</h3>
                    <p className="text-muted-foreground font-bold text-sm uppercase max-w-sm mb-6">
                      Crea tu primer chatbot para automatizar las respuestas de WhatsApp con Gia.
                    </p>
                    <Button onClick={handleCreateBot} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-sm px-8 rounded-xl h-12">
                       <Plus className="w-5 h-5 mr-2" /> Nuevo Flujo
                    </Button>
                 </div>
               )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="training" className="mt-0 outline-none">
           <AssistantGridPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
