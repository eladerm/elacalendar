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
      name: `Asistente IA ${assistants.length + 1}`,
      active: false,
      model: 'gemini-1.5-pro',
      systemPrompt: 'Eres Ela, la asistente virtual de ÉLAPIEL, una clínica especializada en depilación láser y rejuvenecimiento facial. Tu misión principal es captar leads, resolver dudas y agendar citas gratuitas de evaluación.',
      temperature: 0.7,
      maxTokens: 1000,
      assignedWaId: "",
      sources: [],
      tone: 'amistoso',
      responseLength: 'corta',
      language: 'es',
      responseDelay: 3,
      guidelines: [],
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
           <h1 className="text-3xl font-black text-foreground italic uppercase flex items-center gap-3">
              <BrainCircuit className="w-8 h-8 text-primary" />
              Gestor de Asistentes IA
           </h1>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest bg-muted px-3 py-1 rounded-lg border border-border">
                 Configuración de Modelos RAG
              </span>
           </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateAssistant} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-sm px-6 rounded-xl h-11">
             <Plus className="w-4 h-4 mr-2" /> Crear Asistente IA
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
           <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {assistants.map((ast) => (
             <Card key={ast.id} className="bg-card border-border hover:border-primary/50 transition-all overflow-hidden group shadow-sm">
               <CardContent className="p-0">
                  <div className="p-6 border-b border-border relative">
                     <div className="absolute top-4 right-4 flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full shadow-sm",
                          ast.active ? "bg-primary" : "bg-muted-foreground/30"
                        )} />
                     </div>
                     <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                       <BrainCircuit className="w-6 h-6" />
                     </div>
                     <h3 className="text-lg font-black text-foreground tracking-widest truncate">{ast.name}</h3>
                     <p className="text-xs text-muted-foreground font-bold uppercase truncate mt-1">
                       Modelo: {ast.model}
                     </p>
                  </div>
                  
                  <div className="p-4 bg-muted/30 flex flex-col gap-3 border-b border-border">
                     <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                       <span className="text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Motor:</span>
                       <span className={ast.active ? "text-primary" : "text-muted-foreground"}>
                         {ast.active ? 'En Línea' : 'Apagado'}
                       </span>
                     </div>
                     <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                       <span className="text-muted-foreground flex items-center gap-1"><Database className="w-3 h-3" /> Fuentes RAG:</span>
                       <span className="text-blue-500 font-black">
                         {ast.sources?.length || 0} Orígenes
                       </span>
                     </div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                     <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                     </Button>
                     <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-border hover:bg-primary hover:text-primary-foreground text-foreground text-xs uppercase font-black transition-colors" asChild>
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
             <div className="col-span-full p-12 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
                <BrainCircuit className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-black text-foreground italic uppercase mb-2">Sin Cerebros Activos</h3>
                <p className="text-muted-foreground font-bold text-sm uppercase max-w-sm mb-6">
                  Crea tu primer Asistente IA para nutrirlo con manuales y respuestas institucionales de tu empresa.
                </p>
                <Button onClick={handleCreateAssistant} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-sm px-8 rounded-xl h-12">
                   <Plus className="w-5 h-5 mr-2" /> Iniciar Creación
                </Button>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
