"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bot, Save, ArrowLeft, BrainCircuit, FileText, Link as LinkIcon, 
  UploadCloud, Settings, Database, Trash2, Plus, X,
  MessageCircle, Send, RotateCcw, Sparkles, Shield, Globe, Clock,
  Volume2, AlignLeft, Languages, Gauge, ListChecks, ChevronRight, Power
} from 'lucide-react';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AIAssistantConfig } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type TabKey = 'personalidad' | 'fuentes' | 'ajustes';

// Pautas predeterminadas estilo Kommo (Élapiel)
const DEFAULT_GUIDELINES = [
  "Comunica en primera persona, como un representante real de ÉLAPIEL, utilizando un tono amigable y profesional.",
  "Saluda al cliente solo si es la primera interacción y su mensaje contiene un saludo.",
  "Pregunta amablemente por aclaraciones si la información proporcionada es incompleta o poco clara.",
  "Concluye cada conversación confirmando los próximos pasos y sugiriendo acciones como agendar una cita para una evaluación sin costo.",
  "Una vez que acepten agendar la cita, pregunta nombre y apellido así como el lugar, fecha y hora de donde desean ser atendidos.",
  "Explica que cada tratamiento depende del diagnóstico personalizado (folículo, flacidez, tipo de piel o pigmentación según el servicio).",
  "Siempre menciona evaluación gratuita y beneficios promocionales vigentes cuando el cliente pregunte por precio o muestre interés.",
  "Guía siempre la conversación hacia el agendamiento de cita.",
  "Si el cliente menciona embarazo, enfermedad dermatológica o condición médica, sugiere evaluación profesional y transfiere a asesor humano.",
  "Si el cliente deja de responder después de mostrar interés en agendar, retoma la conversación con un mensaje amable invitando nuevamente a reservar.",
  "Cuando el cliente pregunte por precios, utilizar primero el mensaje de precio del servicio correspondiente y no mezclarlo con la respuesta informativa inicial.",
  "No solicitar datos para agendar (nombre, sucursal, día u hora) hasta que el cliente confirme explícitamente que desea reservar su cita.",
  "No enviar bloques extensos de texto.",
  "No mezclar información, precio y agendamiento en un mismo mensaje.",
  "Siempre esperar la respuesta del cliente antes de avanzar al siguiente paso del flujo.",
];

export default function AssistantConfigPage({ params }: { params: { id: string } }) {
  const [ast, setAst] = useState<AIAssistantConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('personalidad');
  const [newTextTitle, setNewTextTitle] = useState("");
  const [newTextSource, setNewTextSource] = useState("");
  const [newGuideline, setNewGuideline] = useState("");
  const [isAddingGuideline, setIsAddingGuideline] = useState(false);

  // Chat preview state
  const [previewMessages, setPreviewMessages] = useState<{role: 'user' | 'bot'; text: string}[]>([
    { role: 'bot', text: '¡Soy tu agente de IA! Puedes probarme haciéndome preguntas para ver lo que sé.' }
  ]);
  const [previewInput, setPreviewInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const docRef = doc(db, 'crm_ai_assistants', params.id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as AIAssistantConfig;
        setAst({ 
          ...data,
          id: snapshot.id,
          tone: data.tone || 'amistoso',
          responseLength: data.responseLength || 'corta',
          language: data.language || 'es',
          responseDelay: data.responseDelay ?? 3,
          guidelines: data.guidelines || [],
        });
      }
    }
    load();
  }, [params.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [previewMessages]);

  const handleSave = async () => {
    if (!ast) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'crm_ai_assistants', ast.id);
      const { id, ...data } = ast;
      await updateDoc(docRef, data);
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
      
      // 🚀 Enviar directamente a AnythingLLM
      const res = await fetch('/api/anythingllm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              action: 'add_document',
              title: newSource.name,
              content: newTextSource
          })
      });
      
      if (!res.ok) {
          console.warn("Fallo el envío a AnythingLLM, pero se guardará en metadata de Firebase", await res.text());
      } else {
          toast({ title: "Documento inyectado en AnythingLLM exitosamente" });
      }

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

  const handleSyncAnythingLLM = async () => {
      if (!ast) return;
      setIsSaving(true);
      try {
          const configContent = `Personalidad: ${ast.systemPrompt}\n\nTono: ${ast.tone}\nReglas y Pautas:\n${(ast.guidelines || []).map(g => "- " + g).join("\n")}`;
          
          const res = await fetch('/api/anythingllm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  action: 'add_document',
                  title: `Configuración Base: ${ast.name}`,
                  content: configContent
              })
          });

          if (res.ok) {
              toast({ title: "Sincronizado con AnythingLLM exitosamente" });
          } else {
              toast({ title: "Hubo un error al sincronizar con AnythingLLM", variant: "destructive" });
          }
      } catch (e) {
         console.error("Sync Error:", e);
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

  // Guidelines management
  const addGuideline = () => {
    if (!ast || !newGuideline.trim()) return;
    const updated = [...(ast.guidelines || []), newGuideline.trim()];
    setAst({ ...ast, guidelines: updated });
    setNewGuideline("");
    setIsAddingGuideline(false);
  };

  const removeGuideline = (index: number) => {
    if (!ast) return;
    const updated = (ast.guidelines || []).filter((_, i) => i !== index);
    setAst({ ...ast, guidelines: updated });
  };

  const updateGuideline = (index: number, value: string) => {
    if (!ast) return;
    const updated = [...(ast.guidelines || [])];
    updated[index] = value;
    setAst({ ...ast, guidelines: updated });
  };

  const loadDefaultGuidelines = () => {
    if (!ast) return;
    setAst({ ...ast, guidelines: [...DEFAULT_GUIDELINES] });
  };

  // Preview chat simulation
  const sendPreviewMessage = () => {
    if (!previewInput.trim()) return;
    setPreviewMessages(prev => [...prev, { role: 'user', text: previewInput }]);
    const userMsg = previewInput;
    setPreviewInput('');
    
    // Simulate AI response after delay
    setTimeout(() => {
      setPreviewMessages(prev => [...prev, { 
        role: 'bot', 
        text: `Gracias por tu mensaje. Estoy configurado con tono "${ast?.tone || 'amistoso'}" y respuestas "${ast?.responseLength || 'corta'}". En producción, respondería usando mis fuentes de conocimiento y pautas configuradas. 🤖` 
      }]);
    }, (ast?.responseDelay || 2) * 1000);
  };

  const resetPreview = () => {
    setPreviewMessages([
      { role: 'bot', text: '¡Soy tu agente de IA! Puedes probarme haciéndome preguntas para ver lo que sé.' }
    ]);
  };

  if (!ast) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin" />
        <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Cargando cerebro...</p>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground rounded-xl">
            <Link href="/crm/asistentes"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-black text-foreground italic uppercase flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-primary" />
              {ast.name}
              <span className={cn(
                "text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border not-italic",
                ast.active 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-muted text-muted-foreground border-border"
              )}>
                {ast.active ? 'Activado' : 'Desactivado'}
              </span>
            </h1>
            <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-0.5">
              Configura tu agente de IA para conversar con clientes como tú quieras.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSyncAnythingLLM} 
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 font-black px-4 rounded-xl h-10"
          >
            <Database className="w-4 h-4 mr-2" /> Sync AnythingLLM
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              const docRef = doc(db, 'crm_ai_assistants', ast.id);
              updateDoc(docRef, { active: !ast.active });
              setAst({...ast, active: !ast.active});
            }}
            className={cn(
              "font-black text-xs uppercase rounded-xl h-10 border-2 transition-all",
              ast.active 
                ? "border-destructive/50 text-destructive hover:bg-destructive/10" 
                : "border-primary/50 text-primary hover:bg-primary/10"
            )}
          >
            <Power className="w-4 h-4 mr-2" />
            {ast.active ? 'Desactivar agente' : 'Activar agente'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-sm px-6 rounded-xl h-10">
            <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {([
          { key: 'personalidad' as TabKey, label: 'Personalidad', icon: Sparkles },
          { key: 'fuentes' as TabKey, label: 'Fuentes', icon: Database },
          { key: 'ajustes' as TabKey, label: 'Ajustes', icon: Settings },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
              activeTab === tab.key 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ CONTENT + PREVIEW ═══════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,340px] gap-6">

        {/* ──── LEFT: MAIN CONTENT ──── */}
        <div className="space-y-6 min-w-0">

          {/* ═══ TAB: PERSONALIDAD ═══ */}
          {activeTab === 'personalidad' && (
            <>
              {/* Rol y personalidad */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" /> Rol y personalidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <Textarea 
                    value={ast.systemPrompt}
                    onChange={e => setAst({...ast, systemPrompt: e.target.value})}
                    className="bg-background border-border text-foreground min-h-[160px] text-sm focus-visible:ring-primary leading-relaxed"
                    placeholder="Ej: Eres Ela, la asistente virtual de ÉLAPIEL, una clínica de depilación láser y rejuvenecimiento facial. Tu misión es captar leads y agendar citas..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    Define el rol, la personalidad y el contexto de tu agente. Esto guía todas sus respuestas.
                  </p>
                </CardContent>
              </Card>

              {/* Selectores de Tono, Longitud, Idioma, Demora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-primary" /> Tono de voz
                    </label>
                    <select 
                      value={ast.tone || 'amistoso'}
                      onChange={e => setAst({...ast, tone: e.target.value as any})}
                      className="w-full bg-background border border-border text-foreground h-10 rounded-lg px-3 text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                    >
                      <option value="amistoso">😊 Amistoso</option>
                      <option value="profesional">💼 Profesional</option>
                      <option value="casual">🤙 Casual</option>
                      <option value="persuasivo">🎯 Persuasivo</option>
                      <option value="empatico">💜 Empático</option>
                    </select>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <AlignLeft className="w-3.5 h-3.5 text-primary" /> Longitud de respuestas
                    </label>
                    <select 
                      value={ast.responseLength || 'corta'}
                      onChange={e => setAst({...ast, responseLength: e.target.value as any})}
                      className="w-full bg-background border border-border text-foreground h-10 rounded-lg px-3 text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                    >
                      <option value="corta">📝 Corta</option>
                      <option value="media">📄 Media</option>
                      <option value="larga">📋 Larga</option>
                    </select>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-primary" /> Idioma de respuesta
                    </label>
                    <select 
                      value={ast.language || 'es'}
                      onChange={e => setAst({...ast, language: e.target.value as any})}
                      className="w-full bg-background border border-border text-foreground h-10 rounded-lg px-3 text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                    >
                      <option value="es">🇪🇨 Español</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="pt">🇧🇷 Português</option>
                    </select>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Demora (segundos)
                    </label>
                    <Input 
                      type="number" 
                      min={0} 
                      max={30}
                      value={ast.responseDelay ?? 3}
                      onChange={e => setAst({...ast, responseDelay: parseInt(e.target.value) || 0})}
                      className="bg-background border-border text-foreground h-10 font-bold focus-visible:ring-primary"
                    />
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      Los clientes dividen sus ideas en varios mensajes. Tu agente espera este tiempo antes de responder.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ═══ PAUTAS (Guidelines) ═══ */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-primary" /> Pautas
                    </CardTitle>
                    {(!ast.guidelines || ast.guidelines.length === 0) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadDefaultGuidelines}
                        className="text-[10px] font-black uppercase text-primary border-primary/30 hover:bg-primary/10 rounded-lg h-7"
                      >
                        <Sparkles className="w-3 h-3 mr-1.5" /> Cargar Pautas Élapiel
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Configura las instrucciones que deben cumplirse en cada mensaje.
                  </p>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {(ast.guidelines || []).map((g, i) => (
                    <div key={i} className="group flex items-start gap-2 bg-muted/40 border border-border rounded-xl p-3 hover:border-primary/30 transition-colors">
                      <div className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <input
                        type="text"
                        value={g}
                        onChange={(e) => updateGuideline(i, e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-foreground font-medium placeholder:text-muted-foreground"
                        placeholder="Escribe una pauta..."
                      />
                      <button
                        onClick={() => removeGuideline(i)}
                        className="w-6 h-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add new guideline */}
                  {isAddingGuideline ? (
                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/30 rounded-xl p-3">
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                      <input
                        type="text"
                        value={newGuideline}
                        onChange={(e) => setNewGuideline(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addGuideline(); if (e.key === 'Escape') setIsAddingGuideline(false); }}
                        autoFocus
                        className="flex-1 bg-transparent border-none outline-none text-sm text-foreground font-medium placeholder:text-muted-foreground/60"
                        placeholder="Escribe la nueva pauta y presiona Enter..."
                      />
                      <Button size="sm" variant="ghost" onClick={() => setIsAddingGuideline(false)} className="h-7 text-muted-foreground">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" onClick={addGuideline} disabled={!newGuideline.trim()} className="h-7 bg-primary text-primary-foreground text-[10px] font-black rounded-lg">
                        Añadir
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingGuideline(true)}
                      className="w-full py-2.5 text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Añadir pauta
                    </button>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══ TAB: FUENTES ═══ */}
          {activeTab === 'fuentes' && (
            <>
              <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-primary font-black italic uppercase text-lg">Ingestión de Datos en Vivo</h3>
                  <p className="text-primary/80 text-xs font-bold uppercase tracking-widest mt-1">Conecta múltiples fuentes para que el bot aprenda</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Capacidad</div>
                  <div className="text-lg font-black text-foreground">{calculateSize()}</div>
                </div>
              </div>

              {/* Archivos */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-primary" /> Archivos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-all cursor-pointer group">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                      <UploadCloud className="w-7 h-7 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <h3 className="text-base font-black text-foreground uppercase tracking-widest mb-1">Cargar Documentos</h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest max-w-sm mb-3">
                      Arrastra PDFs, DOCX ó CSV con catálogos o preguntas frecuentes.
                    </p>
                    <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl">
                      Seleccionar Archivo
                    </Button>
                  </div>
                  <div className="mt-6 space-y-2">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-primary" /> Archivos Entrenados ({ast.sources?.filter(s=>s.type==='file').length || 0})
                    </h4>
                    {(!ast.sources || ast.sources.filter(s=>s.type==='file').length === 0) && (
                      <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest bg-muted p-3 rounded-xl border border-border text-center">
                        No hay archivos indexados aún.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Texto Plano */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Texto Plano
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                    Pega aquí información rápida que el bot debe saber (direcciones, horarios, promociones temporales).
                  </p>
                  <Input 
                    placeholder="Título o Referencia (Ej. Horarios 2026)"
                    value={newTextTitle}
                    onChange={e => setNewTextTitle(e.target.value)}
                    className="bg-background border-border text-foreground h-10 focus-visible:ring-primary"
                  />
                  <Textarea 
                    className="bg-background border-border text-foreground min-h-[120px] text-sm focus-visible:ring-primary"
                    placeholder="Ejemplo: Nuestro horario de atención es de Lunes a Sábado de 9:00 AM a 6:00 PM..."
                    value={newTextSource}
                    onChange={e => setNewTextSource(e.target.value)}
                  />
                  <Button 
                    onClick={handleAddText}
                    disabled={isSaving || !newTextSource.trim()}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-sm h-10 rounded-xl"
                  >
                    Añadir a la Base de Conocimiento
                  </Button>
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-primary" /> Notas Entrenadas ({ast.sources?.filter(s=>s.type==='text').length || 0})
                    </h4>
                    {ast.sources?.filter(s=>s.type==='text').map(source => (
                      <div key={source.id} className="bg-muted p-3 rounded-xl border border-border flex flex-col gap-1.5">
                        <div className="flex justify-between items-start">
                          <span className="text-primary font-bold text-sm">{source.name}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSource(source.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-foreground/80 line-clamp-3">{source.content}</p>
                      </div>
                    ))}
                    {(!ast.sources || ast.sources.filter(s=>s.type==='text').length === 0) && (
                      <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest bg-muted p-3 rounded-xl border border-border text-center">
                        No hay notas de texto indexadas aún.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Enlaces */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-primary" /> Enlaces Web
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                    Añade enlaces a tu página web o tienda para que el bot lea y aprenda.
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://tupagina.com/quienes-somos"
                      className="bg-background border-border text-foreground h-10 focus-visible:ring-primary"
                    />
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-sm h-10 px-6 rounded-xl">
                      Escanear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══ TAB: AJUSTES ═══ */}
          {activeTab === 'ajustes' && (
            <>
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" /> Motor LLM
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nombre Identificador</label>
                    <Input 
                      value={ast.name}
                      onChange={e => setAst({...ast, name: e.target.value})}
                      className="bg-background border-border text-foreground h-10 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Modelo Base</label>
                    <select 
                      value={ast.model}
                      onChange={e => setAst({...ast, model: e.target.value as any})}
                      className="w-full bg-background border border-border text-foreground h-10 rounded-lg px-3 text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                    >
                      <option value="anythingllm">AnythingLLM (Motor Local)</option>
                      <option value="gpt-4o">GPT-4o (Recomendado)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Rápido)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      Creatividad (Temperatura: {ast.temperature})
                    </label>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={ast.temperature}
                      onChange={e => setAst({...ast, temperature: parseFloat(e.target.value)})}
                      className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[10px] text-muted-foreground/80">Valores bajos: Exacto y Robótico. Valores altos: Creativo e Impredecible.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado del Agente</label>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border">
                      <Switch 
                        checked={ast.active} 
                        onCheckedChange={(val) => setAst({...ast, active: val})}
                      />
                      <span className="text-sm font-bold text-foreground">{ast.active ? 'Activo — Respondiendo mensajes' : 'Inactivo — Sin responder'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ──── RIGHT: LIVE PREVIEW ──── */}
        <div className="hidden xl:block">
          <div className="sticky top-6">
            {/* Phone Preview */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {/* Phone Chrome */}
              <div className="bg-muted/50 p-3 border-b border-border flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">00:33</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 bg-muted-foreground/30 rounded-sm" />
                  <div className="w-3 h-2 bg-muted-foreground/30 rounded-sm" />
                  <div className="w-5 h-2.5 bg-muted-foreground/40 rounded-sm" />
                </div>
              </div>

              {/* WA Header */}
              <div className="bg-primary/10 px-4 py-3 flex items-center gap-3 border-b border-border">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                    Agente de IA
                    <span className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </h3>
                </div>
              </div>

              {/* Chat Area */}
              <div className="h-[380px] overflow-y-auto p-4 space-y-3 bg-background/50">
                {previewMessages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    {msg.role === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mr-2 mt-1">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] font-medium leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-card border border-border text-foreground rounded-tl-sm"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border bg-card/80">
                <div className="flex items-center gap-2">
                  <Input
                    value={previewInput}
                    onChange={(e) => setPreviewInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendPreviewMessage(); }}
                    placeholder="Mensaje..."
                    className="flex-1 bg-background/50 border-border text-foreground h-9 text-xs rounded-xl focus-visible:ring-primary"
                  />
                  <Button 
                    size="icon" 
                    onClick={sendPreviewMessage}
                    disabled={!previewInput.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 w-9 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Reset button */}
              <div className="p-2 border-t border-border bg-muted/30 flex justify-center">
                <button onClick={resetPreview} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors">
                  <RotateCcw className="w-3 h-3" /> Reiniciar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
