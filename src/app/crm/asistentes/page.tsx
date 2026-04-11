"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Settings2, 
  Activity, 
  Trash2,
  BrainCircuit,
  Database
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AIAssistantConfig } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function AssistantGridPage() {
  const [assistants, setAssistants] = useState<AIAssistantConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, 'crm_ai_assistants'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveBots = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as AIAssistantConfig));
      setAssistants(liveBots);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateAssistant = async () => {
    const newAst: Partial<AIAssistantConfig> = {
      name: `Nuevo Asistente IA ${assistants.length + 1}`,
      active: false,
      model: 'gpt-4o',
      systemPrompt: 'Eres un asistente útil y cordial.',
      temperature: 0.7,
      maxTokens: 1000,
      assignedWaId: "",
      sources: [],
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    try {
      const docRef = await addDoc(collection(db, 'crm_ai_assistants'), newAst);
      router.push(`/crm/asistentes/${docRef.id}`);
    } catch (e) {
      console.error("Error creating assistant", e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
              <BrainCircuit className="w-8 h-8 text-emerald-500" />
              Gestor de Asistentes IA
           </h1>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                 Configuración de Modelos RAG
              </span>
           </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateAssistant} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-6 rounded-xl h-11">
             <Plus className="w-4 h-4 mr-2" /> Crear Asistente IA
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
           <div className="w-8 h-8 rounded-full border-t-2 border-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {assistants.map((ast) => (
             <Card key={ast.id} className="bg-[#1e293b]/40 border-slate-700/50 hover:border-emerald-500/30 transition-all overflow-hidden group">
               <CardContent className="p-0">
                  <div className="p-6 border-b border-slate-700/50 relative">
                     <div className="absolute top-4 right-4 flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full shadow-lg",
                          ast.active ? "bg-emerald-400 shadow-emerald-400/50" : "bg-slate-600"
                        )} />
                     </div>
                     <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-emerald-500 group-hover:scale-110 transition-transform">
                       <BrainCircuit className="w-6 h-6" />
                     </div>
                     <h3 className="text-lg font-black text-white tracking-widest truncate">{ast.name}</h3>
                     <p className="text-xs text-slate-400 font-bold uppercase truncate mt-1">
                       Modelo: {ast.model}
                     </p>
                  </div>
                  
                  <div className="p-4 bg-slate-900/50 flex flex-col gap-3 border-b border-slate-700/50">
                     <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                       <span className="text-slate-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Motor:</span>
                       <span className={ast.active ? "text-emerald-400" : "text-slate-500"}>
                         {ast.active ? 'En Línea' : 'Apagado'}
                       </span>
                     </div>
                     <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                       <span className="text-slate-500 flex items-center gap-1"><Database className="w-3 h-3" /> Fuentes RAG:</span>
                       <span className="text-blue-400">
                         {ast.sources?.length || 0} Orígenes
                       </span>
                     </div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                     <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                     </Button>
                     <div className="flex gap-2">
                        <Button size="sm" className="bg-slate-800 hover:bg-emerald-500 text-white text-xs uppercase font-black shadow-lg" asChild>
                           <Link href={`/crm/asistentes/${ast.id}`}>
                             <Settings2 className="w-3 h-3 mr-2" /> Entrenar
                           </Link>
                        </Button>
                     </div>
                  </div>
               </CardContent>
             </Card>
           ))}
           
           {assistants.length === 0 && (
             <div className="col-span-full p-12 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-center">
                <BrainCircuit className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-xl font-black text-white italic uppercase mb-2">Sin Cerebros Activos</h3>
                <p className="text-slate-400 font-bold text-sm uppercase max-w-sm mb-6">
                  Crea tu primer Asistente IA para nutrirlo con manuales y respuestas institucionales de tu empresa.
                </p>
                <Button onClick={handleCreateAssistant} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-8 rounded-xl h-12">
                   <Plus className="w-5 h-5 mr-2" /> Iniciar Creación
                </Button>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
