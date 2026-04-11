"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Plus,
  Bot,
  MessageCircle,
  Clock,
  Tag,
  ToggleLeft,
  ToggleRight,
  Play,
  Pencil,
  Trash2,
  ChevronRight,
  Layers
} from 'lucide-react';
import { cn } from "@/lib/utils";

type AutoRule = {
  id: string;
  name: string;
  type: 'keyword' | 'greeting' | 'out_of_hours' | 'funnel';
  trigger: string;
  response: string;
  active: boolean;
};

const autoRules: AutoRule[] = [
  {
    id: '1',
    name: 'Respuesta de Bienvenida',
    type: 'greeting',
    trigger: 'Primer mensaje del cliente',
    response: '¡Hola {{nombre}}! 🌸 Bienvenido/a a ÉLAPIEL. Nuestro equipo te atenderá en breve. ¿En qué podemos ayudarte?',
    active: true
  },
  {
    id: '2',
    name: 'Fuera de Horario',
    type: 'out_of_hours',
    trigger: 'Mensajes fuera de 09:00 - 19:00',
    response: 'Hola, en este momento nuestro horario de atención es de lunes a sábado de 9:00 AM a 7:00 PM. ¡Te responderemos mañana! 😊',
    active: true
  },
  {
    id: '3',
    name: 'Keyword: Precio / Costo',
    type: 'keyword',
    trigger: 'precio, costo, cuánto, valor',
    response: 'Nuestros precios varían según el área y el número de sesiones. Te invitamos a agendar una valoración GRATUITA para darte un presupuesto personalizado. ¿Cuál es tu disponibilidad?',
    active: true
  },
  {
    id: '4',
    name: 'Keyword: Ubicación / Dirección',
    type: 'keyword',
    trigger: 'dirección, ubicación, donde están, cómo llegar',
    response: 'Contamos con dos sucursales: 🏠 Matriz: Av. Principal 123\n🏠 Valle: Calle Secundaria 456\n¿Cuál te queda más cerca?',
    active: false
  },
  {
    id: '5',
    name: 'Embudo: Lead Interesado',
    type: 'funnel',
    trigger: 'Cuando cliente responde plantilla promo',
    response: 'Mover contacto a etapa "Contactados" en el embudo de ventas',
    active: true
  },
];

const typeConfig: Record<AutoRule['type'], { label: string; icon: any; color: string }> = {
  keyword: { label: 'Keyword', icon: Tag, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  greeting: { label: 'Bienvenida', icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  out_of_hours: { label: 'Fuera Horario', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  funnel: { label: 'Embudo', icon: Layers, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
};

export default function CRMAutomatizacionPage() {
  const [rules, setRules] = useState(autoRules);

  const toggleRule = (id: string) => {
    setRules(r => r.map(rule => rule.id === id ? { ...rule, active: !rule.active } : rule));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
            <Zap className="w-8 h-8 text-emerald-500" />
            Automatizaciones
          </h1>
          <p className="text-slate-400 font-bold mt-1 text-sm uppercase tracking-wider">
            Reglas inteligentes de respuesta automática para WhatsApp
          </p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-6 rounded-xl h-11">
          <Plus className="w-4 h-4 mr-2" /> Nueva Regla
        </Button>
      </div>

      {/* Banner de AI */}
      <Card className="bg-gradient-to-r from-violet-600/20 to-emerald-600/20 border-violet-500/20 rounded-2xl overflow-hidden">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-white italic uppercase">Chatbot con Inteligencia Artificial</h3>
            <p className="text-slate-400 font-bold text-sm mt-1">
              Activa el asistente AI para responder automáticamente preguntas frecuentes, agendar citas y calificar leads.
            </p>
          </div>
          <Button className="bg-violet-500 hover:bg-violet-600 text-white font-black rounded-xl h-11 px-6 shrink-0 shadow-lg shadow-violet-500/20">
            Activar AI Chat <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Métricas de Automatización */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Mensajes Automáticos', value: '1,840', sub: 'Este mes' },
          { label: 'Ahorro en Tiempo', value: '38h', sub: 'Estimado mensual' },
          { label: 'Tasa de Resolución', value: '67%', sub: 'Sin intervención' },
        ].map(m => (
          <Card key={m.label} className="bg-[#1e293b]/40 border-slate-700/50 rounded-2xl">
            <CardContent className="p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.label}</p>
              <p className="text-2xl font-black text-white mt-1">{m.value}</p>
              <p className="text-[10px] font-bold text-slate-600 mt-0.5">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de Reglas */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reglas Configuradas ({rules.length})</h2>
        {rules.map(rule => {
          const cfg = typeConfig[rule.type];
          return (
            <Card key={rule.id} className={cn(
              "border rounded-2xl transition-all",
              rule.active ? "bg-[#1e293b]/40 border-slate-700/50 hover:border-slate-600/60" : "bg-slate-900/20 border-slate-800/30 opacity-60"
            )}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn("p-2.5 rounded-xl border shrink-0", cfg.color)}>
                    <cfg.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="text-sm font-black text-white">{rule.name}</h3>
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-widest", cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="space-y-2 mt-3">
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5 shrink-0 w-12">Activador</span>
                        <span className="text-[11px] font-bold text-slate-400 italic">{rule.trigger}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5 shrink-0 w-12">Responde</span>
                        <span className="text-[11px] font-bold text-slate-400 line-clamp-2 leading-relaxed">{rule.response}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className="group"
                      title={rule.active ? 'Desactivar' : 'Activar'}
                    >
                      {rule.active
                        ? <ToggleRight className="w-8 h-8 text-emerald-500 group-hover:text-emerald-400 transition-colors" />
                        : <ToggleLeft className="w-8 h-8 text-slate-600 group-hover:text-slate-400 transition-colors" />}
                    </button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-white border border-slate-700/50 rounded-xl">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500/50 hover:text-red-500 border border-red-900/30 rounded-xl">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
