"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap, Plus, Bot, MessageCircle, Clock, Tag, ToggleLeft, ToggleRight,
  Pencil, Trash2, ChevronRight, Layers, X, Save
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';

type AutoRule = {
  id: string;
  name: string;
  type: 'keyword' | 'greeting' | 'out_of_hours' | 'funnel';
  trigger: string;
  response: string;
  active: boolean;
};

const typeConfig: Record<AutoRule['type'], { label: string; icon: any; color: string }> = {
  keyword: { label: 'Keyword', icon: Tag, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  greeting: { label: 'Bienvenida', icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  out_of_hours: { label: 'Fuera Horario', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  funnel: { label: 'Embudo', icon: Layers, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
};

const emptyRule: Partial<AutoRule> = { name: '', type: 'keyword', trigger: '', response: '', active: true };

export default function CRMAutomatizacionPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<AutoRule>>(emptyRule);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'crm_auto_rules'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setRules(snap.docs.map(d => ({ id: d.id, ...d.data() } as AutoRule)));
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleRule = async (rule: AutoRule) => {
    await updateDoc(doc(db, 'crm_auto_rules', rule.id), { active: !rule.active });
  };

  const handleOpenCreate = () => {
    setEditingRule(emptyRule);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: AutoRule) => {
    setEditingRule(rule);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && editingRule.id) {
        const { id, ...data } = editingRule;
        await updateDoc(doc(db, 'crm_auto_rules', id), data);
        toast({ title: 'Regla actualizada' });
      } else {
        await addDoc(collection(db, 'crm_auto_rules'), {
          ...editingRule,
          active: true,
          createdAt: serverTimestamp()
        });
        toast({ title: 'Regla creada exitosamente' });
      }
      setIsModalOpen(false);
    } catch {
      toast({ title: 'Error al guardar regla', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta regla?')) return;
    try {
      await deleteDoc(doc(db, 'crm_auto_rules', id));
      toast({ title: 'Regla eliminada' });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground italic uppercase flex items-center gap-3">
            <Zap className="w-8 h-8 text-emerald-500" />
            Automatizaciones
          </h1>
          <p className="text-muted-foreground font-bold mt-1 text-sm uppercase tracking-wider">
            Reglas inteligentes de respuesta automática para WhatsApp
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-6 rounded-xl h-11">
          <Plus className="w-4 h-4 mr-2" /> Nueva Regla
        </Button>
      </div>

      {/* Banner AI */}
      <Card className="bg-gradient-to-r from-violet-600/20 to-emerald-600/20 border-violet-500/20 rounded-2xl overflow-hidden">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-foreground italic uppercase">Chatbot con Inteligencia Artificial</h3>
            <p className="text-muted-foreground font-bold text-sm mt-1">
              Activa el asistente AI para responder automáticamente preguntas frecuentes, agendar citas y calificar leads.
            </p>
          </div>
          <Button asChild className="bg-violet-500 hover:bg-violet-600 text-white font-black rounded-xl h-11 px-6 shrink-0 shadow-lg shadow-violet-500/20">
            <a href="/crm/chatbots">Ver Chatbots <ChevronRight className="w-4 h-4 ml-1" /></a>
          </Button>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Reglas Activas', value: rules.filter(r => r.active).length },
          { label: 'Total de Reglas', value: rules.length },
          { label: 'Tipos Configurados', value: [...new Set(rules.map(r => r.type))].length },
        ].map(m => (
          <Card key={m.label} className="bg-card border-border rounded-2xl">
            <CardContent className="p-5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{m.label}</p>
              <p className="text-2xl font-black text-foreground mt-1">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de Reglas */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          Reglas Configuradas ({rules.length})
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin" />
          </div>
        ) : rules.length === 0 ? (
          <Card className="bg-card border-border rounded-2xl">
            <CardContent className="p-12 text-center text-muted-foreground font-bold uppercase tracking-widest text-sm">
              No hay reglas de automatización configuradas.
            </CardContent>
          </Card>
        ) : rules.map(rule => {
          const cfg = typeConfig[rule.type];
          return (
            <Card key={rule.id} className={cn(
              "border rounded-2xl transition-all",
              rule.active ? "bg-card border-border hover:border-border/80" : "bg-muted/20 border-border/30 opacity-60"
            )}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn("p-2.5 rounded-xl border shrink-0", cfg.color)}>
                    <cfg.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="text-sm font-black text-foreground">{rule.name}</h3>
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-widest", cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 shrink-0 w-16">Activador</span>
                        <span className="text-[11px] font-bold text-muted-foreground italic">{rule.trigger}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 shrink-0 w-16">Respuesta</span>
                        <span className="text-[11px] font-bold text-muted-foreground line-clamp-2 leading-relaxed">{rule.response}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleRule(rule)} title={rule.active ? 'Desactivar' : 'Activar'} className="group">
                      {rule.active
                        ? <ToggleRight className="w-8 h-8 text-emerald-500 group-hover:text-emerald-400 transition-colors" />
                        : <ToggleLeft className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />}
                    </button>
                    <Button onClick={() => handleOpenEdit(rule)} variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground border border-border rounded-xl">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button onClick={() => handleDelete(rule.id)} variant="ghost" size="icon" className="h-9 w-9 text-destructive/50 hover:text-destructive border border-destructive/20 rounded-xl">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal Crear/Editar Regla */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-background border-border text-foreground p-0 overflow-hidden">
          <div className="bg-emerald-500/10 p-6 border-b border-emerald-500/20">
            <DialogHeader>
              <DialogTitle className="text-xl font-black italic uppercase text-emerald-600">
                {isEditMode ? 'Editar Regla' : 'Nueva Regla de Automatización'}
              </DialogTitle>
            </DialogHeader>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre de la Regla *</label>
              <Input required value={editingRule.name || ''} onChange={e => setEditingRule({ ...editingRule, name: e.target.value })} className="bg-background border-border font-bold" placeholder="Ej. Respuesta de Bienvenida" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tipo de Regla *</label>
              <select
                required
                value={editingRule.type || 'keyword'}
                onChange={e => setEditingRule({ ...editingRule, type: e.target.value as AutoRule['type'] })}
                className="flex h-10 w-full rounded-xl border text-sm font-bold bg-background border-border text-foreground p-2 outline-none focus:border-primary"
              >
                <option value="keyword">Keyword / Palabra Clave</option>
                <option value="greeting">Bienvenida (Primer Mensaje)</option>
                <option value="out_of_hours">Fuera de Horario</option>
                <option value="funnel">Regla de Embudo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {editingRule.type === 'keyword' ? 'Palabras Clave (separadas por coma)' : 'Descripción del Activador'}
              </label>
              <Input required value={editingRule.trigger || ''} onChange={e => setEditingRule({ ...editingRule, trigger: e.target.value })} className="bg-background border-border font-bold" placeholder={editingRule.type === 'keyword' ? 'precio, costo, cuánto vale' : 'Primer mensaje del cliente'} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Respuesta Automática *</label>
              <textarea
                required
                rows={4}
                value={editingRule.response || ''}
                onChange={e => setEditingRule({ ...editingRule, response: e.target.value })}
                className="w-full text-sm p-2.5 bg-background border border-border rounded-xl outline-none font-bold resize-none focus:border-primary transition-colors"
                placeholder="Mensaje que se enviará automáticamente... Usa {{nombre}}, {{telefono}} como variables."
              />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase">
                <Save className="w-4 h-4 mr-1.5" /> {isEditMode ? 'Guardar Cambios' : 'Crear Regla'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
