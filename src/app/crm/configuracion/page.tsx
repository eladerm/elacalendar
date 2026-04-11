"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings,
  Phone,
  Key,
  Globe,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Users,
  Bell,
  Bot,
  ExternalLink,
  Shield
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function CRMConfiguracionPage() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  const [formState, setFormState] = useState({
    phoneNumberId: '',
    wabaId: '',
    token: '',
    verifyToken: '',
    webhookUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/crm/webhook` : '/api/crm/webhook'
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `✅ ${label} copiado al portapapeles` });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
          <Settings className="w-8 h-8 text-emerald-500" />
          Configuración del CRM
        </h1>
        <p className="text-slate-400 font-bold mt-1 text-sm uppercase tracking-wider">
          Conecta y gestiona tu línea de WhatsApp Business
        </p>
      </div>

      {/* Estado de conexión */}
      <Card className="bg-[#1e293b]/40 border-slate-700/50 rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                <Smartphone className="w-7 h-7 text-slate-500" />
              </div>
              <div>
                <h3 className="font-black text-white uppercase text-sm">Número de WhatsApp</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Sin configurar</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-0.5 font-bold">Ingresa tus credenciales de Meta para conectar</p>
              </div>
            </div>
            <Button variant="outline" className="border-slate-700 text-slate-400 gap-2 font-black text-xs uppercase rounded-xl h-10">
              <RefreshCw className="w-3.5 h-3.5" /> Verificar Conexión
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Credenciales de Meta API */}
      <Card className="bg-[#1e293b]/40 border-slate-700/50 rounded-2xl overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-white font-black uppercase italic flex items-center gap-2 text-lg">
                <Key className="w-5 h-5 text-emerald-500" /> Credenciales de Meta Cloud API
              </CardTitle>
              <CardDescription className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">
                Obtenlas en{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-1">
                  developers.facebook.com <ExternalLink className="w-3 h-3" />
                </a>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Phone Number ID */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Phone className="w-3 h-3 text-emerald-500" /> Phone Number ID
              </Label>
              <Input
                value={formState.phoneNumberId}
                onChange={e => setFormState(s => ({ ...s, phoneNumberId: e.target.value }))}
                placeholder="123456789012345"
                className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-700 focus-visible:ring-emerald-500 rounded-xl font-bold font-mono h-12"
              />
              <p className="text-[10px] text-slate-600 font-bold">WhatsApp → Configuración → Phone Number ID</p>
            </div>

            {/* WABA ID */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-3 h-3 text-emerald-500" /> WhatsApp Business Account ID
              </Label>
              <Input
                value={formState.wabaId}
                onChange={e => setFormState(s => ({ ...s, wabaId: e.target.value }))}
                placeholder="987654321098765"
                className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-700 focus-visible:ring-emerald-500 rounded-xl font-bold font-mono h-12"
              />
              <p className="text-[10px] text-slate-600 font-bold">Meta Business Suite → Configuración de WABA</p>
            </div>
          </div>

          {/* Token de acceso */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3 text-emerald-500" /> Token de Acceso Permanente
            </Label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={formState.token}
                onChange={e => setFormState(s => ({ ...s, token: e.target.value }))}
                placeholder="EAAB..."
                className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-700 focus-visible:ring-emerald-500 rounded-xl font-bold font-mono h-12 pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" onClick={() => setShowToken(s => !s)}>
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-amber-400/80 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Nunca compartas este token. Guárdalo en tus variables de entorno.</p>
          </div>

          <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl h-12 text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Guardar Credenciales
          </Button>
        </CardContent>
      </Card>

      {/* Configuración del Webhook */}
      <Card className="bg-[#1e293b]/40 border-slate-700/50 rounded-2xl overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-700/50">
          <CardTitle className="text-white font-black uppercase italic flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-emerald-500" /> Configuración del Webhook
          </CardTitle>
          <CardDescription className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">
            Pega esta URL en el panel de Meta para recibir mensajes en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL del Webhook</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={formState.webhookUrl}
                className="bg-slate-900/50 border-slate-700/50 text-emerald-400 font-bold font-mono h-12 rounded-xl"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 border-slate-700 text-slate-400 hover:text-white shrink-0 rounded-xl"
                onClick={() => handleCopy(formState.webhookUrl, 'URL del Webhook')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Verify Token */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Token de Verificación (WHATSAPP_WEBHOOK_VERIFY_TOKEN)</Label>
            <div className="relative flex gap-2">
              <Input
                type={showVerifyToken ? 'text' : 'password'}
                value={formState.verifyToken}
                onChange={e => setFormState(s => ({ ...s, verifyToken: e.target.value }))}
                placeholder="Tu secreto personalizado"
                className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-700 focus-visible:ring-emerald-500 rounded-xl font-bold font-mono h-12"
              />
              <Button type="button" variant="outline" size="icon" className="h-12 w-12 border-slate-700 text-slate-400 hover:text-white shrink-0 rounded-xl" onClick={() => setShowVerifyToken(s => !s)}>
                {showVerifyToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Instrucciones paso a paso */}
          <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-700/30 space-y-3">
            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">📋 Pasos de Configuración en Meta</h4>
            {[
              'Accede a Meta for Developers y selecciona tu app.',
              'En el menú izquierdo, ve a WhatsApp → Configuración.',
              'En la sección "Webhooks", haz clic en "Editar".',
              'Pega la URL del Webhook y el Token de Verificación de arriba.',
              'Suscríbete a los campos: messages, message_deliveries, message_reads.',
              'Haz clic en "Verificar y Guardar".',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-emerald-400">{i + 1}</span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
