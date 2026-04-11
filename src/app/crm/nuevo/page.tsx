"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PlusCircle,
  Phone,
  MessageCircle,
  Layers,
  Send,
  Search,
  User,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  FileText
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const templates = [
  { id: 't1', name: 'Confirmación de Cita', category: 'UTILITY', preview: 'Hola {{1}}, te confirmamos tu cita para el día {{2}} a las {{3}}. ¡Te esperamos!' },
  { id: 't2', name: 'Promo Especial Láser', category: 'MARKETING', preview: 'Hola {{1}}, ¡tenemos una promoción especial del 30% en depilación láser solo este mes! 🎉' },
  { id: 't3', name: 'Reactivación de Cliente', category: 'MARKETING', preview: 'Hola {{1}}, ¡hace tiempo no te vemos! Te esperamos con una oferta exclusiva.' },
  { id: 't4', name: 'Solicitud de Reseña', category: 'UTILITY', preview: 'Hola {{1}}, esperamos que estés disfrutando tus tratamientos. ¿Podrías dejarnos una reseña? 🙏' },
];

const categoryColor: Record<string, string> = {
  UTILITY: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  MARKETING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function CRMNuevoChatPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [msgType, setMsgType] = useState<'template' | 'text'>('template');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!phone) {
      toast({ title: 'Ingresa un número de teléfono', variant: 'destructive' });
      return;
    }
    if (msgType === 'template' && !selectedTemplate) {
      toast({ title: 'Selecciona una plantilla', variant: 'destructive' });
      return;
    }
    if (msgType === 'text' && !freeText.trim()) {
      toast({ title: 'El mensaje no puede estar vacío', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const body = msgType === 'template'
        ? { to: phone, type: 'template', templateName: selectedTemplate, chatId: 'new' }
        : { to: phone, type: 'text', message: freeText, chatId: 'new' };

      const res = await fetch('/api/crm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast({ title: '✅ Mensaje enviado correctamente' });
        setStep(3);
      } else {
        const err = await res.json();
        toast({ title: `Error: ${err.error}`, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error al conectar con el servidor', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
          <PlusCircle className="w-8 h-8 text-emerald-500" />
          Iniciar Conversación
        </h1>
        <p className="text-slate-400 font-bold mt-1 text-sm uppercase tracking-wider">
          Envía el primer mensaje a un contacto de WhatsApp
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Destinatario' },
          { n: 2, label: 'Mensaje' },
          { n: 3, label: 'Enviado' },
        ].map((s, i, arr) => (
          <React.Fragment key={s.n}>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
              step >= s.n
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-800/30 border-slate-700/50 text-slate-600"
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px]",
                step > s.n ? "bg-emerald-500 text-white" : step === s.n ? "border-2 border-emerald-500 text-emerald-400" : "border border-slate-700 text-slate-600"
              )}>
                {step > s.n ? <CheckCircle2 className="w-3 h-3" /> : s.n}
              </div>
              {s.label}
            </div>
            {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-slate-700 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Paso 1: Destinatario */}
      {step === 1 && (
        <Card className="bg-[#1e293b]/40 border-slate-700/50 rounded-2xl">
          <CardHeader className="p-6 border-b border-slate-700/50">
            <CardTitle className="text-white font-black italic uppercase flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-500" /> ¿A quién le escribes?
            </CardTitle>
            <CardDescription className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">
              Busca un contacto existente o ingresa un número nuevo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono (con código de país)</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 font-black text-sm">
                  +593
                </div>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9 8765 4321"
                  className="flex-1 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-700 focus-visible:ring-emerald-500 rounded-xl font-bold font-mono h-12"
                />
              </div>
              <div className="flex items-center gap-2 mt-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-[10px] font-bold text-amber-400/80 leading-relaxed">
                  Para iniciar una conversación fría (sin respuesta previa en 24h), <strong>debes usar una plantilla aprobada</strong>.
                </p>
              </div>
            </div>

            <Button
              onClick={() => { if (phone.length >= 9) setStep(2); }}
              disabled={phone.length < 9}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase rounded-xl h-12 shadow-lg shadow-emerald-500/20 disabled:opacity-40"
            >
              Continuar <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Tipo de mensaje */}
      {step === 2 && (
        <Card className="bg-[#1e293b]/40 border-slate-700/50 rounded-2xl">
          <CardHeader className="p-6 border-b border-slate-700/50">
            <CardTitle className="text-white font-black italic uppercase flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-500" /> Tipo de Mensaje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Tipo selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMsgType('template')}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all",
                  msgType === 'template' ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600"
                )}
              >
                <FileText className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-sm font-black text-white">Plantilla Aprobada</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">Recomendado para contactos nuevos</p>
              </button>
              <button
                onClick={() => setMsgType('text')}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all",
                  msgType === 'text' ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600"
                )}
              >
                <MessageCircle className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-sm font-black text-white">Texto Libre</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">Solo si el cliente escribió primero (&lt;24h)</p>
              </button>
            </div>

            {/* Plantillas */}
            {msgType === 'template' && (
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecciona una plantilla</Label>
                {templates.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.name)}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all",
                      selectedTemplate === t.name
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black text-white">{t.name}</span>
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded border", categoryColor[t.category])}>
                        {t.category}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">{t.preview}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Texto Libre */}
            {msgType === 'text' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escribe tu mensaje</Label>
                <Textarea
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  placeholder="Hola, ¿en qué te podemos ayudar hoy?"
                  rows={5}
                  className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-700 focus-visible:ring-emerald-500 rounded-xl font-bold resize-none"
                />
                <p className="text-right text-[10px] font-black text-slate-600">{freeText.length}/4096</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-slate-700 text-slate-400 font-black text-xs uppercase rounded-xl h-12">
                Atrás
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase rounded-xl h-12 shadow-lg shadow-emerald-500/20"
              >
                {isSending ? 'Enviando...' : <><Send className="w-4 h-4 mr-2" /> Enviar Mensaje</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 3: Éxito */}
      {step === 3 && (
        <Card className="bg-[#1e293b]/40 border-emerald-500/30 rounded-2xl">
          <CardContent className="p-12 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 rotate-3">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase">¡Mensaje Enviado!</h2>
              <p className="text-slate-400 font-bold text-sm mt-2">
                Tu conversación con <span className="text-emerald-400">+593 {phone}</span> está activa.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button onClick={() => { setStep(1); setPhone(''); setFreeText(''); setSelectedTemplate(null); }}
                variant="outline" className="flex-1 border-slate-700 text-slate-400 font-black text-xs uppercase rounded-xl h-12">
                Nuevo Mensaje
              </Button>
              <Button asChild className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase rounded-xl h-12">
                <a href="/crm/chat">Ir al Chat</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
