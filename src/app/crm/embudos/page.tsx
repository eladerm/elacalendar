"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, 
  MoreHorizontal, 
  User, 
  Clock, 
  DollarSign,
  GripVertical,
  Filter,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatThread } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const COLUMNS = [
  { id: 'leads', name: 'Nuevos Leads', color: 'bg-emerald-500' },
  { id: 'contacted', name: 'Contactados', color: 'bg-blue-500' },
  { id: 'quoted', name: 'Cotizados', color: 'bg-amber-500' },
  { id: 'closed', name: 'Venta Cerrada', color: 'bg-emerald-600' }
];

export default function CRMEmbudosPage() {
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Firestore Real-time Listener
  useEffect(() => {
    const q = query(collection(db, 'crm_chats'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveChats = snapshot.docs.map(doc => {
         const data = doc.data();
         return {
            id: doc.id,
            ...data,
            // Convert Firestore timestamp to Date
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

    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    const chatId = result.draggableId;

    if (sourceCol === destCol) return; // Same column drop, ignoramos reordenamiento por ahora

    // Optimistic UI Update
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, funnelStage: destCol as any } : chat
    ));

    // Backend Update
    try {
      const chatRef = doc(db, 'crm_chats', chatId);
      await updateDoc(chatRef, {
        funnelStage: destCol
      });
    } catch (e) {
      console.error("Error updating funnel stage:", e);
      // Fallback in case of error (reload state implicitly caught by onSnapshot)
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
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Pipeline */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-white italic uppercase flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-emerald-500" />
              Embudo de Ventas
           </h1>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                 Pipeline Principal
              </span>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">{chats.length} Contactos Mapeados</span>
           </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-slate-700 text-slate-400 font-black text-xs uppercase rounded-xl h-11">
             <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 px-6 rounded-xl h-11">
             <Plus className="w-4 h-4 mr-2" /> Crear Etapa
          </Button>
        </div>
      </div>

      {/* Kanban Board Container */}
      {isMounted && (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent min-h-[70vh] items-stretch">
          
          {COLUMNS.map((col) => {
            // Filtrar chats, si no tienen stage asignado, caen en "leads" por defecto
            const columnChats = chats.filter(c => (c.funnelStage === col.id) || (!c.funnelStage && col.id === 'leads'));

            return (
              <div key={col.id} className="w-80 shrink-0 flex flex-col group/stage h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                   <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-6 rounded-full", col.color)} />
                      <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                         {col.name}
                         <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-700">
                           {columnChats.length}
                         </span>
                      </h3>
                   </div>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                          "flex-1 bg-slate-900/30 rounded-2xl p-3 border transition-colors flex flex-col gap-3",
                          snapshot.isDraggingOver ? "border-emerald-500/50 bg-emerald-500/5" : "border-slate-800/30 hover:border-slate-800/80"
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
                                    "bg-[#1e293b]/90 border border-slate-700/50 p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-emerald-500/50 transition-all group relative",
                                    sn.isDragging ? "shadow-2xl shadow-black/50 rotate-2 z-50 ring-2 ring-emerald-500" : "shadow-md"
                                )}
                             >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white"><MoreHorizontal className="w-3 h-3" /></Button>
                                </div>
                                <div className="flex items-start gap-3">
                                   <div className="mt-1">
                                      <GripVertical className="w-4 h-4 text-slate-600 hover:text-white transition-colors" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-1">
                                         {chat.status === 'open' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                         {chat.status === 'pending' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                         {chat.status === 'closed' && <div className="w-2 h-2 rounded-full bg-slate-600" />}
                                         <h4 className="text-sm font-black text-white truncate uppercase tracking-widest">{chat.name}</h4>
                                      </div>
                                      
                                      <p className="text-[10px] font-bold text-slate-400 line-clamp-1 italic my-2 pl-3 border-l-[1.5px] border-slate-700">
                                          {chat.lastMessage || 'Nuevo contacto...'}
                                      </p>

                                      <p className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1 mt-2">
                                         <Clock className="w-3 h-3 shrink-0" /> {getTimeString(chat.lastTimestamp)}
                                      </p>
                                      
                                   </div>
                                </div>
                             </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      <button className="w-full py-3 mt-auto border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all text-xs font-black uppercase flex items-center justify-center gap-2 group shrink-0">
                        <Plus className="w-3 h-3 group-hover:scale-110 transition-transform text-emerald-500" />
                        Añadir Manual
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
      )}
    </div>
  );
}
