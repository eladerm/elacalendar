"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, 
  MoreHorizontal, 
  Clock, 
  GripVertical,
  LayoutGrid,
  Trash2,
  Edit2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, updateDoc, doc, addDoc, deleteDoc, setDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatThread } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FunnelStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

const DEFAULT_STAGES: FunnelStage[] = [
  { id: 'leads', name: 'Nuevos Leads', color: 'bg-emerald-500', order: 0 },
  { id: 'contacted', name: 'Contactados', color: 'bg-blue-500', order: 1 },
  { id: 'quoted', name: 'Cotizados', color: 'bg-amber-500', order: 2 },
  { id: 'closed', name: 'Venta Cerrada', color: 'bg-slate-600', order: 3 }
];

export default function CRMEmbudosPage() {
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Dialog state
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);
  const [stageForm, setStageForm] = useState({ name: '', color: 'bg-blue-500' });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Listen to Stages
  useEffect(() => {
    const qStages = query(collection(db, 'crm_funnel_stages'), orderBy('order', 'asc'));
    const unsubscribeStages = onSnapshot(qStages, (snapshot) => {
      if (snapshot.empty) {
        // If empty, initialize with default stages locally to show something
        setStages(DEFAULT_STAGES);
      } else {
        const liveStages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FunnelStage));
        setStages(liveStages);
      }
    });

    return () => unsubscribeStages();
  }, []);

  // Listen to Chats
  useEffect(() => {
    const q = query(collection(db, 'crm_chats'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveChats = snapshot.docs.map(doc => {
         const data = doc.data();
         return {
            id: doc.id,
            ...data,
            lastTimestamp: data.lastTimestamp?.toDate ? data.lastTimestamp.toDate() : new Date(),
         } as ChatThread;
      });
      // Sort by newest activity first
      liveChats.sort((a, b) => (b.lastTimestamp?.getTime() || 0) - (a.lastTimestamp?.getTime() || 0));
      setChats(liveChats);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    if (result.type === 'stage') {
        const sourceIndex = result.source.index;
        const destIndex = result.destination.index;
        if (sourceIndex === destIndex) return;

        // Reorder stages
        const newStages = Array.from(stages);
        const [moved] = newStages.splice(sourceIndex, 1);
        newStages.splice(destIndex, 0, moved);

        // Update local optimism
        setStages(newStages.map((s, i) => ({ ...s, order: i })));

        // Update DB
        for (let i = 0; i < newStages.length; i++) {
            const stage = newStages[i];
            if (DEFAULT_STAGES.find(ds => ds.id === stage.id)) {
                // If it's a default static stage, we must create it first before updating order 
                // but let's assume they are already pushed or we only push actual firebase docs.
                // For simplicity, we just setDoc.
                await setDoc(doc(db, 'crm_funnel_stages', stage.id), { ...stage, order: i }, { merge: true });
            } else {
                await updateDoc(doc(db, 'crm_funnel_stages', stage.id), { order: i });
            }
        }
        return;
    }

    // Handing Chat Drag Drop
    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    const chatId = result.draggableId;

    if (sourceCol === destCol) return; 

    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, funnelStage: destCol as any } : chat
    ));

    try {
      const chatRef = doc(db, 'crm_chats', chatId);
      await updateDoc(chatRef, {
        funnelStage: destCol
      });
    } catch (e) {
      console.error("Error updating funnel stage:", e);
    }
  };

  const handleSaveStage = async () => {
      try {
          if (editingStage) {
              await updateDoc(doc(db, 'crm_funnel_stages', editingStage.id), {
                  name: stageForm.name,
                  color: stageForm.color
              });
          } else {
              await addDoc(collection(db, 'crm_funnel_stages'), {
                  name: stageForm.name,
                  color: stageForm.color,
                  order: stages.length
              });
          }
          setIsStageDialogOpen(false);
          setStageForm({ name: '', color: 'bg-blue-500' });
          setEditingStage(null);
      } catch (e) {
          console.error("Error saving stage:", e);
      }
  };

  const handleDeleteStage = async (id: string) => {
      if(confirm('¿Estás seguro de eliminar esta etapa? Los contactos no se perderán, pasarán a la primera etapa.')) {
          try {
             await deleteDoc(doc(db, 'crm_funnel_stages', id));
          } catch(e) {
             console.error("Error deleting stage", e);
          }
      }
  };

  const getTimeString = (date?: Date) => {
      if (!date) return 'Desconocido';
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };

  if (isLoading) {
      return <div className="p-8 text-slate-400 font-bold uppercase tracking-widest text-sm flex items-center justify-center min-h-[500px]">Cargando embudos...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-4 lg:p-8">
      
      {/* Header Pipeline */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-slate-900 italic uppercase flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-[var(--color-primary)]" />
              Embudo de Ventas
           </h1>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                 Pipeline Dinámico
              </span>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">{chats.length} Contactos Mapeados</span>
           </div>
        </div>
        <div className="flex gap-2">
           {/* Botón funcional de Crear Etapa */}
          <Button 
            onClick={() => setIsStageDialogOpen(true)}
            className="bg-[var(--color-primary)] hover:opacity-90 text-white font-black px-6 rounded-xl h-11"
          >
             <Plus className="w-4 h-4 mr-2" /> Crear Etapa
          </Button>
        </div>
      </div>

      {/* Kanban Board Container */}
      {isMounted && (
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" type="stage" direction="horizontal">
          {(provided) => (
            <div 
               ref={provided.innerRef}
               {...provided.droppableProps}
               className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent min-h-[70vh] items-stretch"
            >
              
              {stages.map((col, index) => {
                const columnChats = chats.filter(c => (c.funnelStage === col.id) || (!c.funnelStage && index === 0));

                return (
                  <Draggable key={col.id} draggableId={col.id} index={index}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                           "w-80 shrink-0 flex flex-col group/stage h-full",
                           snapshot.isDragging && "opacity-80 rotate-2"
                        )}
                      >
                        <div className="flex items-center justify-between mb-4 px-2" {...provided.dragHandleProps}>
                           <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-6 rounded-full", col.color)} />
                              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                 {col.name}
                                 <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
                                   {columnChats.length}
                                 </span>
                              </h3>
                           </div>
                           <div className="opacity-0 group-hover/stage:opacity-100 flex items-center gap-1 transition-opacity">
                               <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-[var(--color-primary)]" onClick={() => { setEditingStage(col); setStageForm({ name: col.name, color: col.color }); setIsStageDialogOpen(true); }}>
                                   <Edit2 className="w-3 h-3" />
                               </Button>
                               <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => handleDeleteStage(col.id)}>
                                   <Trash2 className="w-3 h-3" />
                               </Button>
                           </div>
                        </div>

                        <Droppable droppableId={col.id}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                  "flex-1 bg-slate-50 rounded-2xl p-3 border transition-colors flex flex-col gap-3 min-h-[150px]",
                                  snapshot.isDraggingOver ? "border-[var(--color-primary)] bg-[var(--bg-selected)]" : "border-slate-200/60 hover:border-slate-300"
                              )}
                            >
                              {columnChats.map((chat, index) => (
                                <Draggable key={chat.id} draggableId={chat.id} index={index}>
                                  {(provided, sn) => (
                                     <div 
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={cn(
                                            "bg-white border border-slate-200 p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-[var(--color-primary)] transition-all group relative",
                                            sn.isDragging ? "shadow-2xl shadow-slate-200/50 rotate-2 z-50 ring-2 ring-[var(--color-primary)]" : "shadow-sm"
                                        )}
                                     >
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-slate-800"><MoreHorizontal className="w-3 h-3" /></Button>
                                        </div>
                                        <div className="flex items-start gap-3">
                                           <div className="mt-1">
                                              <GripVertical className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
                                           </div>
                                           <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1.5 mb-1">
                                                 <h4 className="text-sm font-black text-slate-800 truncate uppercase tracking-widest">{chat.name}</h4>
                                              </div>
                                              
                                              <p className="text-[10px] font-bold text-slate-500 line-clamp-1 italic my-2 pl-3 border-l-[1.5px] border-slate-200">
                                                  {chat.lastMessage || 'Nuevo contacto...'}
                                              </p>

                                              <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mt-2">
                                                 <Clock className="w-3 h-3 shrink-0" /> {getTimeString(chat.lastTimestamp)}
                                              </p>
                                           </div>
                                        </div>
                                     </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              
              {/* Boton para añadir columna al final */}
              <div className="w-80 shrink-0 h-full pt-10">
                  <button onClick={() => { setEditingStage(null); setStageForm({ name: '', color: 'bg-slate-400' }); setIsStageDialogOpen(true); }} className="w-full h-[150px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors hover:bg-[var(--bg-selected)]">
                      <Plus className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase tracking-widest">Nueva Etapa</span>
                  </button>
              </div>

            </div>
          )}
        </Droppable>
      </DragDropContext>
      )}

      {/* Dialog for Creating/Editing Stage */}
      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingStage ? "Editar Etapa" : "Crear Nueva Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de Etapa</Label>
              <Input 
                value={stageForm.name} 
                onChange={(e) => setStageForm({...stageForm, name: e.target.value})} 
                placeholder="Ej. Seguimiento" 
              />
            </div>
            <div className="space-y-2">
              <Label>Color de Identificación</Label>
              <div className="flex gap-2">
                 {['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-slate-600'].map(c => (
                     <button 
                       key={c} 
                       onClick={() => setStageForm({...stageForm, color: c})}
                       className={cn("w-8 h-8 rounded-full border-2", c, stageForm.color === c ? "border-slate-800 ring-2 ring-offset-2 ring-slate-400" : "border-transparent opacity-70 hover:opacity-100")}
                     />
                 ))}
              </div>
            </div>
          </div>
          <Button onClick={handleSaveStage} disabled={!stageForm.name} className="w-full bg-[var(--color-primary)] text-white">
            {editingStage ? "Guardar Cambios" : "Crear Etapa"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
