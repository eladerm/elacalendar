"use client";

import React, { useState } from 'react';
import { useTheme, THEMES } from '@/components/theme-provider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Phone, Key, Globe, CheckCircle2, Copy, Eye, EyeOff,
  AlertTriangle, MessageSquare, Shield,
  Instagram, Facebook, Info, Power, PlayCircle
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Sub-panels for connections ───
function WhatsAppPanel({ toast }: { toast: any }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ phoneNumberId: '', wabaId: '', token: '' });
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/crm/webhook` : '/api/crm/webhook';

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        <div>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Canal Activo</p>
          <p className="text-sm text-slate-600 mt-0.5">Tu número de WhatsApp Business está activo.</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-600">Phone Number ID</Label>
          <Input value={form.phoneNumberId} onChange={e => setForm(s => ({ ...s, phoneNumberId: e.target.value }))} placeholder="1234567890" className="rounded-xl h-11" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-600">WABA ID</Label>
          <Input value={form.wabaId} onChange={e => setForm(s => ({ ...s, wabaId: e.target.value }))} placeholder="9876543210" className="rounded-xl h-11" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-600">Token de Acceso Permanente</Label>
        <div className="relative">
          <Input type={show ? 'text' : 'password'} value={form.token} onChange={e => setForm(s => ({ ...s, token: e.target.value }))} placeholder="EAAB..." className="rounded-xl h-11 pr-12" />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500" onClick={() => setShow(s => !s)}>
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><AlertTriangle className="w-3.5 h-3.5" /> Nunca compartas este token.</p>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-600">URL del Webhook</Label>
        <div className="flex gap-2">
          <Input readOnly value={webhookUrl} className="bg-slate-50 text-slate-500 font-mono h-11 rounded-xl" />
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: '✅ URL copiada' }); }}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl h-11">
        Guardar Cambios
      </Button>
    </div>
  );
}

function InterGenericPanel({ title, color }: { title: string, color: string }) {
  return (
    <div className="space-y-6 pt-4">
      <div className={`p-5 bg-${color}-50 border border-${color}-100 rounded-2xl space-y-3`}>
        <p className={`text-xs font-bold text-${color}-700 uppercase flex items-center gap-2`}><Info className="w-4 h-4" /> Próximamente</p>
        <p className="text-sm text-slate-600 leading-relaxed">
          La integración de {title} a través de la API oficial de Meta se habilitará muy pronto. Asegúrate de tener tu cuenta de empresa verificada.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function CRMConfiguracionPage() {
  const { toast } = useToast();

  const channels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: 'Convierte a tu número de WhatsApp en multiusuario con el mejor CRM de e-commerce, comparte tus productos y procesa pagos digitales, sin que tu cliente deje la conversación.',
      icon: (
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-10 h-10 object-contain" />
        </div>
      ),
      panel: <WhatsAppPanel toast={toast} />
    },
    {
      id: 'messenger',
      name: 'Messenger',
      description: 'Mejora la comunicación de tu fan page y automatízala con nuestros chatbots, procesa pagos digitales, comparte tus productos y mantén tu negocio en orden. Convierte ese like en una venta segura.',
      icon: (
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg" alt="Messenger" className="w-10 h-10 object-contain" />
        </div>
      ),
      panel: <InterGenericPanel title="Messenger" color="blue" />
    },
    {
      id: 'instagram',
      name: 'Instagram DM',
      description: 'Conéctate con el CRM #1 de Instagram, conversa con tus seguidores, automatiza tu comunicación con chatbots, procesa pagos digitales y mantén tu negocio en orden.',
      icon: (
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
           <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" alt="Instagram DM" className="w-10 h-10 object-contain" />
        </div>
      ),
      panel: <InterGenericPanel title="Instagram DM" color="pink" />
    },
    {
      id: 'fb-comments',
      name: 'Comentarios de Facebook',
      description: 'Convierte a tus comentarios de Facebook en una venta segura conectándolo a nuestro CRM, responder rápidamente las inquietudes de tus seguidores y no dejes escapar ni una sola venta.',
      icon: (
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" alt="Facebook Comments" className="w-10 h-10 object-contain" />
        </div>
      ),
      panel: <InterGenericPanel title="Facebook Comments" color="blue" />
    },
    {
      id: 'ig-comments',
      name: 'Comentarios de Instagram',
      description: 'Responde a los comentarios de tus seguidores de manera inmediata, convierte cada comentario de tus posts en una venta segura e incrementa las ganancias de tu negocio.',
      icon: (
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" alt="Instagram Comments" className="w-10 h-10 object-contain" />
        </div>
      ),
      panel: <InterGenericPanel title="Instagram Comments" color="pink" />
    }
  ];

  return (
    <div className="p-8 max-w-[1200px] animate-in fade-in duration-500 space-y-10">
      
      {/* Theme Selection Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Apariencia</h2>
          <p className="text-sm text-slate-500">Personaliza la paleta de colores de tu CRM.</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <ThemeSelector />
        </div>
      </section>

      {/* Integrations Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Conexiones</h2>
          <p className="text-sm text-slate-500">Conecta tus canales de comunicación al CRM.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map(channel => (
          <div key={channel.id} className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col shadow-sm">
            
            <div className="flex items-center gap-4 mb-4">
              {channel.icon}
              <h3 className="text-base font-bold text-slate-800">{channel.name}</h3>
            </div>
            
            <p className="text-sm text-slate-500 mb-8 flex-1 leading-relaxed">
              {channel.description}
            </p>
            
            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="secondary" 
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-2xl h-10 text-xs shadow-sm border border-slate-100"
                  >
                    <Power className="w-3.5 h-3.5 mr-2" />
                    Conectar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-xl">
                      {channel.icon} Configurar {channel.name}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-2">
                    {channel.panel}
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                variant="secondary" 
                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-2xl h-10 text-xs shadow-sm border border-slate-100"
              >
                <PlayCircle className="w-3.5 h-3.5 mr-2" />
                Ver video
              </Button>
            </div>

          </div>
        ))}
        </div>
      </section>

    </div>
  );
}

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Active Theme Preview Banner */}
      <div
        className="w-full h-20 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-500 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${THEMES[theme]?.colorPrimary}cc, ${THEMES[theme]?.colorSecondary}99)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative text-center">
          <p className="text-white font-black text-sm uppercase tracking-[0.2em]">{THEMES[theme]?.name}</p>
          <p className="text-white/70 text-[10px] font-bold uppercase mt-0.5">Tema activo en tu CRM</p>
        </div>
        {/* Corner accents */}
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-white/30" />
        <div className="absolute bottom-3 left-4 w-6 h-6 rounded-full bg-white/10" />
      </div>

      {/* Grid de Paletas */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(THEMES).map(([key, config]) => {
          const isSelected = theme === key;
          return (
            <button
              key={key}
              onClick={() => setTheme(key)}
              title={config.name}
              className={`
                group relative flex flex-col items-center gap-2.5 p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer
                ${isSelected
                  ? 'border-current shadow-lg scale-[1.04]'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50 hover:scale-[1.02]'
                }
              `}
              style={{ borderColor: isSelected ? config.colorPrimary : undefined }}
            >
              {/* Color Swatch */}
              <div
                className="w-12 h-12 rounded-xl shadow-sm relative flex-shrink-0 transition-all group-hover:shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${config.colorPrimary} 50%, ${config.colorSecondary} 100%)`,
                }}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle2
                      className="w-6 h-6 text-white drop-shadow-md"
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                    />
                  </div>
                )}
              </div>

              {/* Tono de color (mini strip) */}
              <div className="w-full flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                <div className="flex-1 rounded-full" style={{ backgroundColor: config.bgSelected }} />
                <div className="flex-1 rounded-full" style={{ backgroundColor: config.colorSecondary + '80' }} />
                <div className="flex-1 rounded-full" style={{ backgroundColor: config.colorPrimary }} />
              </div>

              {/* Nombre */}
              <span className="text-[10px] font-black text-center tracking-tight leading-tight text-slate-700 group-hover:text-slate-900 transition-colors">
                {config.name}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
        El color se aplica a toda la interfaz del CRM al instante.
      </p>
    </div>
  );
}

