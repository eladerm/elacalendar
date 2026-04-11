"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, Save, ArrowLeft, BrainCircuit, FileText, Link as LinkIcon, 
  UploadCloud, Settings, Database, Activity, Trash2 
} from 'lucide-react';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AIAssistantConfig } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

export default function AssistantConfigPage({ params }: { params: { id: string } }) {
  const [ast, setAst] = useState<AIAssistantConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newTextTitle, setNewTextTitle] = useState("");
  const [newTextSource, setNewTextSource] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const docRef = doc(db, 'crm_ai_assistants', params.id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setAst({ id: snapshot.id, ...snapshot.data() } as AIAssistantConfig);
      }
    }
    load();
  }, [params.id]);

  const handleSave = async () => {
    if (!ast) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'crm_ai_assistants', ast.id);
      const { id, ...data } = ast;
      await updateDoc(docRef, data);
      // Opcional: Notificar éxito
      router.push('/crm/asistentes');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateSize = () => {
     if (!ast || !ast.sources) return "0 / 15 MB";
     const totalBytes = ast.sources.reduce((acc, src) => acc + (src.size || 0), 0);
     const mb = (totalBytes / (1024 * 1024)).toFixed(2);
     return `${mb} / 15.0 MB`;
  };

  const handleAddText = async () => {
    if (!ast || !newTextSource.trim()) return;
    setIsSaving(true);
    try {
      const newSource = {
        id: Date.now().toString(),
        type: 'text' as const,
        content: newTextSource,
        name: newTextTitle.trim() || 'Nota de Texto',
        size: new Blob([newTextSource]).size,
        status: 'ready' as const,
        updatedAt: new Date()
      };
      const updatedSources = [...(ast.sources || []), newSource];
      
      const docRef = doc(db, 'crm_ai_assistants', ast.id);
      await updateDoc(docRef, { sources: updatedSources });
      
      setAst({ ...ast, sources: updatedSources });
      setNewTextSource("");
      setNewTextTitle("");
    } catch (e) {
       console.error("Error al añadir texto", e);
    } finally {
       setIsSaving(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
     if (!ast) return;
     const updatedSources = ast.sources.filter(s => s.id !== sourceId);
     try {
        const docRef = doc(db, 'crm_ai_assistants', ast.id);
        await updateDoc(docRef, { sources: updatedSources });
        setAst({ ...ast, sources: updatedSources });
     } catch(e) {
        console.error("Error delete", e);
     }
  };

  if (!ast) return <div className="p-12 text-slate-400">Cargando cerebro...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
              <BrainCircuit className="w-8 h-8 text-emerald-500" />
              Entrenar: {ast.name}
           </h1>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                 Ingesta de Conocimiento (RAG)
              </span>
           </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" asChild className="border-slate-700 text-slate-300 font-bold text-xs uppercase h-11 rounded-xl hover:bg-slate-800">
               <Link href="/crm/asistentes"><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Link>
           </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-6 rounded-xl h-11">
             <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Guardando...' : 'Guardar y Entrenar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Configuración de Motor (Izquierda) */}
         <div className="space-y-6">
            <Card className="bg-[#1e293b]/60 border-slate-700/50">
               <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                     <Settings className="w-4 h-4 text-emerald-500" /> Motor LLM
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre Identificador</label>
                     <Input 
                        value={ast.name}
                        onChange={e => setAst({...ast, name: e.target.value})}
                        className="bg-slate-900/50 border-slate-700 text-white"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modelo Base</label>
                     <select 
                        value={ast.model}
                        onChange={e => setAst({...ast, model: e.target.value as any})}
                        className="w-full bg-slate-900/50 border border-slate-700 text-white h-10 rounded-md px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                     >
                        <option value="gpt-4o">GPT-4o (Recomendado)</option>
                        <option value="gpt-4o-mini">GPT-4o Mini (Rápido)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Creatividad (Temperatura: {ast.temperature})</label>
                     <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={ast.temperature}
                        onChange={e => setAst({...ast, temperature: parseFloat(e.target.value)})}
                        className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                     />
                     <p className="text-[10px] text-slate-500 mt-1">Valores bajos: Exacto y Robótico. Valores altos: Creativo e Impredecible.</p>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-[#1e293b]/60 border-slate-700/50">
               <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                     <Bot className="w-4 h-4 text-emerald-500" /> Promt del Sistema
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                  <Textarea 
                     value={ast.systemPrompt}
                     onChange={e => setAst({...ast, systemPrompt: e.target.value})}
                     className="bg-slate-900/50 border-slate-700 text-white min-h-[200px] text-xs font-mono"
                     placeholder="Ej: Eres un asistente de ventas para la marca Élapiel. Tu objetivo es agendar turnos..."
                  />
               </CardContent>
            </Card>
         </div>

         {/* Fuentes de Datos (Centro y Derecha) */}
         <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-gradient-to-r from-emerald-600/10 to-transparent border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
               <div>
                  <h3 className="text-emerald-400 font-black italic uppercase text-lg">Ingestión de Datos en Vivo</h3>
                  <p className="text-emerald-500/80 text-xs font-bold uppercase tracking-widest mt-1">Conecta múltiples fuentes para que el bot aprenda</p>
               </div>
               <div className="text-right">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Capacidad</div>
                  <div className="text-lg font-black text-white">{calculateSize()}</div>
               </div>
            </div>

            <Card className="bg-[#1e293b]/60 border-slate-700/50 overflow-hidden">
               <Tabs defaultValue="archivos" className="w-full">
                 <div className="bg-slate-900/50 p-2 border-b border-slate-700/50">
                    <TabsList className="bg-transparent border-none gap-2">
                      <TabsTrigger value="archivos" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl px-6">
                         <UploadCloud className="w-4 h-4 mr-2" /> Archivos
                      </TabsTrigger>
                      <TabsTrigger value="texto" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl px-6">
                         <FileText className="w-4 h-4 mr-2" /> Texto Plano
                      </TabsTrigger>
                      <TabsTrigger value="enlaces" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl px-6">
                         <LinkIcon className="w-4 h-4 mr-2" /> Enlaces
                      </TabsTrigger>
                    </TabsList>
                 </div>

                 {/* Tab: Archivos */}
                 <TabsContent value="archivos" className="p-8 m-0">
                    <div className="border-2 border-dashed border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-slate-900/20 hover:bg-slate-900/40 hover:border-emerald-500/50 transition-all cursor-pointer group">
                       <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                          <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-emerald-500" />
                       </div>
                       <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1">Cargar Documentos</h3>
                       <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-sm mb-4">
                          Arrastra PDFs, DOCX ó CSV con el catálogo o preguntas frecuentes.
                       </p>
                       <Button variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl">
                          Seleccionar Archivo
                       </Button>
                    </div>

                    <div className="mt-8 space-y-3">
                       <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <Database className="w-4 h-4 text-emerald-500" /> Archivos Entrenados ({ast.sources?.filter(s=>s.type==='file').length || 0})
                       </h4>
                       {/* Lista vacia por defecto */}
                       {(!ast.sources || ast.sources.filter(s=>s.type==='file').length === 0) && (
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-widest bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 text-center">
                             No hay archivos indexados aún.
                          </div>
                       )}
                    </div>
                 </TabsContent>

                 {/* Tab: Texto Plano */}
                 <TabsContent value="texto" className="p-8 m-0 space-y-4">
                     <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1">Inyección de Texto Libre</h3>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">
                        Pega aquí información rápida que el bot debe saber (direcciones, horarios, promociones temporales).
                     </p>
                     <Input 
                        placeholder="Título o Referencia (Ej. Horarios 2026)"
                        value={newTextTitle}
                        onChange={e => setNewTextTitle(e.target.value)}
                        className="bg-slate-900/50 border-slate-700 text-white h-11 mb-2"
                     />
                     <Textarea 
                        className="bg-slate-900/50 border-slate-700 text-white min-h-[150px] text-sm"
                        placeholder="Ejemplo: Nuestro horario de atención es de Lunes a Sábado de 9:00 AM a 6:00 PM. Aceptamos pagos con tarjeta..."
                        value={newTextSource}
                        onChange={e => setNewTextSource(e.target.value)}
                     />
                     <Button 
                        onClick={handleAddText}
                        disabled={isSaving || !newTextSource.trim()}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 h-11 rounded-xl"
                     >
                        Añadir a la Base de Conocimiento
                     </Button>

                     <div className="mt-8 space-y-3">
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                           <Database className="w-4 h-4 text-emerald-500" /> Notas Entrenadas ({ast.sources?.filter(s=>s.type==='text').length || 0})
                        </h4>
                        {ast.sources?.filter(s=>s.type==='text').map(source => (
                           <div key={source.id} className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-2">
                               <div className="flex justify-between items-start">
                                  <span className="text-emerald-400 font-bold text-sm">{source.name}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-red-400" onClick={() => handleDeleteSource(source.id)}>
                                      <Trash2 className="w-4 h-4" />
                                  </Button>
                               </div>
                               <p className="text-xs text-slate-300 line-clamp-3">{source.content}</p>
                           </div>
                        ))}
                        {(!ast.sources || ast.sources.filter(s=>s.type==='text').length === 0) && (
                           <div className="text-xs text-slate-500 font-bold uppercase tracking-widest bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 text-center">
                              No hay notas de texto indexadas aún.
                           </div>
                        )}
                     </div>
                 </TabsContent>

                 {/* Tab: Enlaces */}
                 <TabsContent value="enlaces" className="p-8 m-0 space-y-4">
                     <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1">Scraping de URLs</h3>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">
                        Añade enlaces a tu página web o tienda para que el bot lea y aprenda dinámicamente.
                     </p>
                     <div className="flex gap-2">
                        <Input 
                           placeholder="https://tupagina.com/quienes-somos"
                           className="bg-slate-900/50 border-slate-700 text-white h-11"
                        />
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 h-11 px-8 rounded-xl">
                           Escanear
                        </Button>
                     </div>
                 </TabsContent>

               </Tabs>
            </Card>

         </div>
      </div>
    </div>
  );
}
