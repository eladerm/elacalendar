"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, BrainCircuit, Workflow, Hand, Filter, Sparkles, ShieldAlert, BookText, AlertCircle, ArrowRight } from 'lucide-react';

export default function GuiasCRMPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
          <BookText className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tight text-white">Manual de Operación</h1>
          <p className="text-slate-400 font-medium">Motor Híbrido Conversacional de Élapiel</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-6 text-emerald-100/80 leading-relaxed shadow-lg backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BrainCircuit className="w-32 h-32 text-emerald-300" />
        </div>
        <p className="relative z-10 text-lg">
          Bienvenido a la guía definitiva para configurar y entrenar la arquitectura conversacional del CRM Inteligente. Este documento explica de manera sencilla a tus agentes cómo conviven los bots visuales (reglas), la asistente de Inteligencia Artificial (Ela) y la atención manual en un mismo lado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1 */}
        <Card className="bg-[#1e293b]/80 border-slate-700/50 hover:border-emerald-500/30 transition-colors pt-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <BrainCircuit className="w-5 h-5 text-blue-400" />
              </div>
              <CardTitle className="text-xl text-white">1. El "Doble Cerebro"</CardTitle>
            </div>
            <CardDescription className="text-slate-400">¿Cómo funciona el motor en cascada?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300 text-sm">
            <p>Cuando un cliente escribe por WhatsApp, el sistema se hace las siguientes preguntas en orden:</p>
            <ol className="list-decimal list-inside space-y-3 font-medium bg-slate-900/50 p-4 rounded-lg border border-slate-800">
              <li>
                <span className="text-white font-bold">¿Bot Pausado?</span> Si SÍ, el sistema ignora toda automatización para permitirte responder.
              </li>
              <li>
                <span className="text-white font-bold">¿Hay una palabra mágica?</span> Si detona un "Gatillo", se inician los flujos visuales (cajas cuadradas).
              </li>
              <li>
                <span className="text-white font-bold">¿Asistente Libre?</span> Si ninguna de las dos anteriores es verdad, el mensaje lo responde **Ela** (Genkit AI), quien leerá sus notas para persuadir la venta libremente.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card className="bg-[#1e293b]/80 border-slate-700/50 hover:border-emerald-500/30 transition-colors pt-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <Workflow className="w-5 h-5 text-purple-400" />
              </div>
              <CardTitle className="text-xl text-white">2. Automatizaciones (Cajas)</CardTitle>
            </div>
            <CardDescription className="text-slate-400">Menús de botones y encuestas rígidas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300 text-sm">
            <p>En <span className="text-purple-400 font-bold px-1 bg-purple-400/10 rounded">Automatización &gt; Chatbots</span> configuras árboles de decisión donde la IA no improvisa.</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-white">Gatillo Inicial:</strong> Usa palabras clave (Ej: <code>info</code>). Así secuestramos temporalmente a Ela.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-white">Menús de Opciones:</strong> El flujo se pausa automáticamente esperando que el usuario escriba el número asignado.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span><strong className="text-white">Finalizar Flujo:</strong> Al desconectar la última caja, el CRM le devolverá el chat a Ela o al humano.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card className="bg-[#1e293b]/80 border-slate-700/50 hover:border-emerald-500/30 transition-colors pt-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <CardTitle className="text-xl text-white">3. Ela, Tu Asistente de IA</CardTitle>
            </div>
            <CardDescription className="text-slate-400">El alma de las ventas conversacionales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300 text-sm">
            <p>En el menú <span className="text-emerald-400 font-bold px-1 bg-emerald-400/10 rounded">Asistentes IA</span> entrenas a Ela mediante inyección contextual y un prompt clave.</p>
            <div className="bg-slate-900/50 p-4 rounded-lg space-y-3 border border-slate-800">
              <div>
                <strong className="text-white flex items-center gap-2 block mb-1">
                  1. Reglas de Personalidad (System Prompt)
                </strong>
                Indícale cómo responder. (Ej: "Eres vendedora, nunca revelas el precio de buenas a primeras, sé persuasiva").
              </div>
              <div>
                <strong className="text-white flex items-center gap-2 block mb-1">
                  2. Inyección RAG (Notas)
                </strong>
                No la dejes adivinar. Sube documentos de precios, promociones, direcciones, y horarios. Ela los escaneará y proveerá respuestas certeras al paciente.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4 */}
        <Card className="bg-[#1e293b]/80 border-slate-700/50 hover:border-red-500/30 transition-colors pt-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-500/20 p-2 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <CardTitle className="text-xl text-white">4. Toma de Control Manual</CardTitle>
            </div>
            <CardDescription className="text-slate-400">Cuando un humano debe intervenir directamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300 text-sm">
            <p>Si la conversación con el bot no da frutos, un agente puede silenciar al bot para negociar directamente:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Hand className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>Dentro del chat clica el botón <strong>"Pausar Bot"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <Hand className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>El candado cambiará a naranja (BOT PAUSADO). El webhook de WhatsApp cortará la respuesta de Ela transitoriamente.</span>
              </li>
              <li className="flex items-start gap-2">
                <Hand className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>Clic en reactivar una vez cerrado el trato.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 5 */}
        <Card className="bg-[#1e293b]/80 border-slate-700/50 hover:border-orange-500/30 transition-colors md:col-span-2 pt-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-500/20 p-2 rounded-lg">
                <Filter className="w-5 h-5 text-orange-400" />
              </div>
              <CardTitle className="text-xl text-white">5. El Embudo de Ventas (Pipelines)</CardTitle>
            </div>
            <CardDescription className="text-slate-400">Tractabilidad total sobre tus pacientes en juego.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300 text-sm w-full">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <h4 className="text-white font-bold">Gestión Dinámica:</h4>
                <p>Tu módulo de <span className="text-orange-400 font-bold px-1 bg-orange-400/10 rounded">Embudos</span> es tu panel kanban principal. Todos los leads que cruzan por el chat de WhatsApp (identificados correctamente) llegan a la columna inicial. ¡Arrastra su tarjeta hacia "Vendido" cuando completes la cita!</p>
              </div>
              <div className="w-full h-px md:w-px md:h-auto bg-slate-800 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <h4 className="text-white font-bold">Inserción Local:</h4>
                <p>¿Ingresó un cliente caminando por la puerta? Dale a "Nuevo" e inserta manualmente al embudo. El registro CRM subsistirá de forma local sin que posea mensajes de WhatsApp amarrados hasta que decida escribirte.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
