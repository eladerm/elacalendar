"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Send, 
  Clock, 
  CheckCheck, 
  Check,
  Phone, 
  Mail, 
  MessageCircle,
  Filter,
  AlertCircle,
  ArrowLeft,
  Facebook,
  Instagram,
  UserPlus,
  UserMinus,
  UserCheck,
  Tag,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { ChatThread as BaseChatThread, ChatMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from '@/components/auth-provider';
import { useContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ChatThread extends BaseChatThread {
  botPaused?: boolean;
  aiSummary?: string;
  assignedTo?: string; // ID of the agent
  assignedToName?: string;
  funnelStageId?: string; // ID de la etapa actual en el Kanban
  dealsTotal?: number; // Para el módulo de ventas
}

type ChatStatus = 'abierto' | 'espera' | 'cerrado';
type AssignFilter = 'todos' | 'mios' | 'sin-asignar';

interface QuickReply {
  id: string;
  shortcut: string;
  text: string;
}

const DEMO_QUICK_REPLIES: QuickReply[] = [
  { id: '1', shortcut: '/hola', text: '¡Hola! Gracias por comunicarte con Élapiel. ¿En qué podemos ayudarte?' },
  { id: '2', shortcut: '/precio', text: 'Nuestros precios varían según la zona. ¿Qué zona corporal te interesa?' },
  { id: '3', shortcut: '/ubicacion', text: 'Nos encontramos ubicados en la Av principal. Atendemos de Lunes a Sábado.' },
  { id: '4', shortcut: '/promos', text: '¡Claro! Actualmente tenemos promoción de 3x2 en sesiones de depilación láser.' },
];

// Datos de demostración (se reemplazarán con datos reales de Firestore)
const demoConversations: ChatThread[] = [
  { id: '1', waId: '593912345678', name: 'Maria Jose', lastMessage: 'Quiero agendar para mañana...', lastTimestamp: new Date(), status: 'open', unreadCount: 2, channel: 'whatsapp' },
  { id: '2', waId: '593987654321', name: 'Carlos Ruíz', lastMessage: 'Gracias, ya recibí el pago.', lastTimestamp: new Date(Date.now() - 3600000), status: 'pending', unreadCount: 0, channel: 'instagram' },
  { id: '3', waId: '593955556666', name: 'Ana Belén', lastMessage: '¿Tienen disponibilidad en Matriz?', lastTimestamp: new Date(Date.now() - 86400000), status: 'closed', unreadCount: 0, channel: 'facebook' },
];

const ChannelIcon = ({ channel, className }: { channel?: string, className?: string }) => {
  if (channel === 'instagram') return <Instagram className={cn("w-4 h-4 text-pink-500", className)} />;
  if (channel === 'facebook') return <Facebook className={cn("w-4 h-4 text-blue-600", className)} />;
  return <MessageCircle className={cn("w-4 h-4 text-green-500", className)} />; // Defecto WhatsApp
};

const demoMessages: ChatMessage[] = [
  { id: '101', chatId: '1', from: 'business', to: '593912345678', body: '¡Hola! ¿En qué podemos ayudarte hoy? 😊', type: 'text', status: 'read', timestamp: new Date(Date.now() - 3600000 * 2), isIncoming: false },
  { id: '102', chatId: '1', from: '593912345678', to: 'business', body: 'Hola, quiero agendar una cita para depilación láser en la sucursal del Valle.', type: 'text', status: 'delivered', timestamp: new Date(Date.now() - 3600000), isIncoming: true },
  { id: '103', chatId: '1', from: 'business', to: '593912345678', body: 'Perfecto Maria. ¿Te parece bien mañana a las 10:00 AM?', type: 'text', status: 'delivered', timestamp: new Date(Date.now() - 1800000), isIncoming: false },
  { id: '104', chatId: '1', from: '593912345678', to: 'business', body: '¡Sí, me queda genial! ¿Qué costo tiene la sesión?', type: 'text', status: 'delivered', timestamp: new Date(Date.now() - 300000), isIncoming: true },
];

const statusIcon = (s: ChatMessage['status']) => {
  if (s === 'read') return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
  if (s === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
  if (s === 'sent') return <Check className="w-3.5 h-3.5 text-muted-foreground/80" />;
  return <Clock className="w-3 h-3 text-muted-foreground/60" />;
};

const formatTime = (d: Date) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

const getFlagEmoji = (countryCode?: string) => {
  if (!countryCode) return '🌎';
  return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export default function CRMChatPage() {
  const { toast } = useToast();
  const auth = useContext(AuthContext);
  const currentUser = auth?.user;

  const [chats, setChats] = useState<ChatThread[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [activeFilter, setActiveFilter] = useState<ChatStatus>('abierto');
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('todos');
  
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Quick Replies State
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [filteredReplies, setFilteredReplies] = useState<QuickReply[]>(DEMO_QUICK_REPLIES);
  
  // Internal Notes State
  const [noteText, setNoteText] = useState('');
  const [isNoteFocused, setIsNoteFocused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listener de Firestore para la Llista de Chats
  useEffect(() => {
    const q = query(collection(db, 'crm_chats'), orderBy('lastTimestamp', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const liveChats = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          lastTimestamp: data.lastTimestamp instanceof Timestamp ? data.lastTimestamp.toDate() : new Date(),
        } as ChatThread;
      });
      setChats(liveChats);
      // Seleccionar el primero si no hay ninguno seleccionado y hay datos
      if (liveChats.length > 0 && !selectedChat) {
        setSelectedChat(liveChats[0]);
      }
    }, err => console.error('Chats list listener error:', err));
    return () => unsub();
  }, []);

  // Nuevo estado para las Etapas del Embudo
  const [funnelStages, setFunnelStages] = useState<any[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'crm_funnel_stages'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, snap => {
       setFunnelStages(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, []);

  // Estado para el Catálogo de Productos (Order Modal)
  const [products, setProducts] = useState<any[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, number>>({});
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'crm_products'), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const toggleProductQty = (id: string, delta: number) => {
    setSelectedProductIds(prev => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  };

  const orderTotal = products
    .filter(p => selectedProductIds[p.id])
    .reduce((sum, p) => sum + p.price * (selectedProductIds[p.id] || 0), 0);

  const handleGenerateOrder = async () => {
    if (!selectedChat || Object.keys(selectedProductIds).length === 0) return;
    const lines = products
      .filter(p => selectedProductIds[p.id])
      .map(p => `• ${p.name} x${selectedProductIds[p.id]} = $${(p.price * selectedProductIds[p.id]).toFixed(2)}`);
    const orderMsg = [
      '🛒 *Resumen de Tu Pedido*',
      ...lines,
      `\n💵 *Total: $${orderTotal.toFixed(2)}*`,
      '\nNuestro equipo te contactará para confirmar y coordinar el pago. 🙌'
    ].join('\n');

    try {
      // Inyectar el pedido como mensaje en el chat (NO toca el webhook, solo Firebase)
      await addDoc(collection(db, 'crm_messages'), {
        chatId: selectedChat.id,
        from: 'business',
        to: selectedChat.waId,
        body: orderMsg,
        type: 'text',
        isIncoming: false,
        status: 'sent',
        channel: selectedChat.channel || 'whatsapp',
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'crm_chats', selectedChat.id), {
        lastMessage: '🛒 Pedido generado',
        lastTimestamp: serverTimestamp()
      });
      setIsOrderModalOpen(false);
      setSelectedProductIds({});
      toast({ title: 'Pedido generado e inyectado en el chat 🚀' });
    } catch {
      toast({ title: 'Error al generar el pedido', variant: 'destructive' });
    }
  };

  // Listener de Firestore para el chat seleccionado
  useEffect(() => {
    if (!selectedChat || !selectedChat.id) return;
    const q = query(
      collection(db, 'crm_messages'),
      where('chatId', '==', selectedChat.id)
    );
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const live = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
          } as ChatMessage;
        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setMessages(live);
      }
      // Si está vacío, mantiene los mensajes de demo
    }, err => console.error('Chat listener error:', err));
    return () => unsub();
  }, [selectedChat?.id]);

  const handleSend = async () => {
    if (!selectedChat || !inputText.trim() || isSending) return;
    const body = inputText.trim();
    setInputText('');
    setIsSending(true);

    // UI Optimista: añadir el mensaje inmediatamente
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      chatId: selectedChat.id,
      from: 'business',
      to: selectedChat.waId,
      body,
      type: 'text',
      status: 'sent',
      timestamp: new Date(),
      isIncoming: false
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/crm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChat.id, to: selectedChat.waId, message: body })
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: `Error WhatsApp: ${err.error}`, variant: 'destructive' });
        // Revertir el mensaje optimista
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      }
    } catch (e) {
      toast({ title: 'Error de conexión', variant: 'destructive' });
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showQuickReplies && filteredReplies.length > 0) {
        // Seleccionar la primera respuesta rápida al dar enter
        handleSelectQuickReply(filteredReplies[0]);
      } else {
        handleSend();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const parts = val.split(' ');
    const lastWord = parts[parts.length - 1];

    if (lastWord.startsWith('/')) {
      setShowQuickReplies(true);
      const query = lastWord.toLowerCase();
      setFilteredReplies(DEMO_QUICK_REPLIES.filter(qr => qr.shortcut.toLowerCase().includes(query)));
    } else {
      setShowQuickReplies(false);
    }
  };

  const handleSelectQuickReply = (qr: QuickReply) => {
    const parts = inputText.split(' ');
    parts.pop(); // Remove the typed shortcut
    const newText = parts.length > 0 ? parts.join(' ') + ' ' + qr.text : qr.text;
    setInputText(newText + ' ');
    setShowQuickReplies(false);
  };

  const handleSaveNote = async () => {
    if (!selectedChat || !noteText.trim()) return;
    try {
      const payload = { internalNote: noteText.trim() };
      await updateDoc(doc(db, 'crm_chats', selectedChat.id), payload);
      toast({ title: 'Nota guardada exitosamente' });
      setSelectedChat({...selectedChat, ...payload} as any);
      setIsNoteFocused(false);
    } catch {
      toast({ title: 'Error al guardar la nota', variant: 'destructive' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({ title: `Subiendo archivo: ${file.name}...` });
      // Aquí se implementaría la lógica de subida a Firebase Storage
      setTimeout(() => {
        toast({ title: 'Archivo enviado exitosamente' });
        // Enviar como mensaje URL optimista o real
      }, 1500);
    }
  };

  const filteredChats = chats.filter(c => {
    // Primero filtramos por Asignación
    if (assignFilter === 'mios' && c.assignedTo !== currentUser?.id) return false;
    if (assignFilter === 'sin-asignar' && (c.assignedTo !== undefined && c.assignedTo !== null && c.assignedTo !== '')) return false;

    // Luego por estado
    if (activeFilter === 'abierto') return c.status === 'open';
    if (activeFilter === 'espera') return c.status === 'pending';
    return c.status === 'closed';
  });

  const handleUpdateStatus = async (newStatus: 'open' | 'pending' | 'closed') => {
      if (!selectedChat) return;
      try {
        await updateDoc(doc(db, 'crm_chats', selectedChat.id), { status: newStatus });
        toast({ title: `Chat movido a ${newStatus}` });
        setSelectedChat({...selectedChat, status: newStatus});
      } catch (err) {
        toast({ title: 'Error al cambiar estado', variant: 'destructive' });
      }
  };

  const handleToggleBot = async (pause: boolean) => {
      if (!selectedChat) return;
      try {
        const payload: any = { botPaused: pause };
        if (!pause) payload.aiSummary = null; // Clean summary when reactivating
        
        await updateDoc(doc(db, 'crm_chats', selectedChat.id), payload);
        toast({ title: pause ? 'Bot pausado. Chat transferido a Humano.' : 'Bot reactivado exitosamente.' });
        setSelectedChat({...selectedChat,...payload});
      } catch (err) {
        toast({ title: 'Error al cambiar estado del bot', variant: 'destructive' });
      }
  };

  const handleUpdateAssignment = async (assignToMe: boolean) => {
      if (!selectedChat) return;
      try {
        const payload = assignToMe 
          ? { assignedTo: currentUser?.id, assignedToName: currentUser?.name }
          : { assignedTo: '', assignedToName: '' };
          
        await updateDoc(doc(db, 'crm_chats', selectedChat.id), payload);
        toast({ title: assignToMe ? 'Te has asignado este chat' : 'Chat desasignado' });
        setSelectedChat({...selectedChat, ...payload});
      } catch (err) {
        toast({ title: 'Error al cambiar asignación', variant: 'destructive' });
      }
  };

  const handleChangeFunnelStage = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!selectedChat) return;
      const val = e.target.value;
      try {
          await updateDoc(doc(db, 'crm_chats', selectedChat.id), { funnelStageId: val });
          toast({ title: 'Etapa del embudo actualizada' });
          setSelectedChat({...selectedChat, funnelStageId: val});
      } catch(err) {
          toast({ title: 'Error al actualizar etapa', variant: 'destructive' });
      }
  };

  return (
    <div className="h-[calc(100vh-56px)] flex bg-card border border-border rounded-none overflow-hidden shadow-sm animate-in fade-in duration-500">
      
      {/* COLUMNA 1: LISTA DE CONVERSACIONES */}
      <div className="w-72 border-r border-border bg-card/40 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => window.location.href = '/'}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-black text-foreground italic uppercase tracking-wider">Chats</h2>
            </div>
  
            </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
               placeholder="Buscar cliente..." 
               className="pl-10 bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary rounded-xl font-bold"
            />
          </div>

          <div className="flex flex-col gap-2 bg-muted/30 p-2 rounded-xl">
             {/* Asignación row */}
             <div className="flex gap-1">
               {(['todos', 'mios', 'sin-asignar'] as AssignFilter[]).map(f => (
                 <button 
                    key={f}
                    onClick={() => setAssignFilter(f)}
                    className={cn(
                      "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                      assignFilter === f ? "bg-background text-foreground shadow-sm shadow-black/5" : "text-muted-foreground hover:text-foreground"
                    )}
                 >
                   {f === 'todos' ? 'Todos' : f === 'mios' ? 'Míos' : 'Sin Asignar'}
                 </button>
               ))}
             </div>
             {/* Estado row */}
             <div className="flex gap-1">
               {(['abierto', 'espera', 'cerrado'] as ChatStatus[]).map(f => (
                 <button 
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      activeFilter === f ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                    )}
                 >
                   {f}
                 </button>
               ))}
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto divide-y divide-border/50">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Sin conversaciones en este estado</p>
            </div>
          ) : filteredChats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={cn(
                "p-4 flex items-center gap-4 cursor-pointer transition-all border-l-4",
                selectedChat?.id === chat.id 
                  ? "bg-accent border-primary" 
                  : "bg-transparent border-transparent hover:bg-accent/40"
              )}
            >
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center shrink-0 font-black text-foreground uppercase italic border-2 border-border/50">
                {chat.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                   <h3 className="text-sm font-black text-foreground truncate flex items-center gap-1">
                      {getFlagEmoji(chat.countryCode)} 
                      <ChannelIcon channel={chat.channel} className="w-3.5 h-3.5 mr-0.5" />
                      {chat.name}
                   </h3>
                   <span className="text-[9px] font-black text-muted-foreground uppercase">
                     {chat.lastTimestamp instanceof Date ? formatTime(chat.lastTimestamp) : ''}
                   </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5 font-bold">{chat.lastMessage}</p>
              </div>
              {(chat.unreadCount ?? 0) > 0 && (
                <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-black shadow-sm animate-pulse">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* COLUMNA 2 & 3: ÁREA DE MENSAJES Y DETALLE */}
      {!selectedChat ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-background/50 h-full">
            <MessageCircle className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-black text-muted-foreground uppercase tracking-widest">Selecciona un chat</h3>
            <p className="text-sm text-muted-foreground/80 mt-2">Los mensajes aparecerán aquí</p>
        </div>
      ) : (
        <>
          {/* COLUMNA 2: ÁREA DE MENSAJES */}
          <div className="flex-1 flex flex-col h-full bg-background/30 relative">
            {/* Header del Chat: Action Console */}
            <div className="p-4 border-b border-border bg-card/60 flex justify-between items-center backdrop-blur-md">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center font-black italic">
                    {selectedChat.name?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-foreground tracking-wide flex items-center gap-2">
                       <span className="text-lg">{getFlagEmoji(selectedChat.countryCode)}</span>
                       <ChannelIcon channel={selectedChat.channel} className="w-4 h-4" />
                       {selectedChat.name}
                       <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-widest">
                          {selectedChat.status === 'open' ? 'Abierto' : selectedChat.status === 'pending' ? 'Espera' : 'Cerrado'}
                       </span>
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", selectedChat.status === 'open' ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
                        <span className="text-[10px] font-black text-primary/80 uppercase tracking-widest">+{selectedChat.waId}</span>
                        {selectedChat.botPaused && (
                           <span className="ml-2 text-[9px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full border border-destructive/20 uppercase font-black">Bot Pausado</span>
                        )}
                    </div>
                  </div>
              </div>
              <div className="flex gap-2">
                  {!selectedChat.botPaused ? (
                    <Button onClick={() => handleToggleBot(true)} variant="outline" className="border-border text-muted-foreground hover:text-primary font-bold text-[10px] uppercase h-9 rounded-xl">
                        <span className="flex items-center gap-2">Pausar Bot & Transferir <ArrowLeft className="w-3 h-3 rotate-180"/></span>
                    </Button>
                  ) : (
                    <Button onClick={() => handleToggleBot(false)} variant="outline" className="border-border text-muted-foreground hover:text-foreground bg-accent font-bold text-[10px] uppercase h-9 rounded-xl">
                        <span className="flex items-center gap-2">Reactivar Bot <MessageCircle className="w-3 h-3"/></span>
                    </Button>
                  )}
              </div>
            </div>

            {/* Context Summary from AI Handoff */}
            {selectedChat.botPaused && selectedChat.aiSummary && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 px-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                       <h4 className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-0.5">Transferencia de IA</h4>
                       <p className="text-xs font-bold text-yellow-700/80">{selectedChat.aiSummary}</p>
                    </div>
                </div>
            )}

            {/* Mensajes */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="flex flex-col gap-4">
                  {messages.map((m) => (
                    <div key={m.id} className={cn(
                      "flex flex-col max-w-[78%]",
                      m.isIncoming ? "mr-auto items-start" : "ml-auto items-end"
                    )}>
                      <div className={cn(
                          "p-4 rounded-2xl text-sm font-bold relative shadow-sm",
                          m.isIncoming 
                            ? "bg-card text-card-foreground rounded-tl-none border border-border" 
                            : "bg-primary text-primary-foreground rounded-tr-none"
                      )}>
                          {m.body}
                          <div className={cn(
                            "flex items-center gap-1 mt-2 text-[10px]",
                            m.isIncoming ? "text-muted-foreground" : "text-primary-foreground/70 justify-end"
                          )}>
                            {formatTime(m.timestamp instanceof Date ? m.timestamp : new Date())}
                            {!m.isIncoming && statusIcon(m.status)}
                          </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Wrapper con Quick Replies */}
            <div className="relative p-4 bg-card/60 backdrop-blur-md border-t border-border">
              {/* Quick Replies Popover */}
              {showQuickReplies && filteredReplies.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-bottom-2">
                  <div className="p-2 bg-muted/30 border-b border-border">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Respuestas Rápidas</span>
                  </div>
                  <div className="max-h-60 overflow-auto py-1">
                    {filteredReplies.map((qr, idx) => (
                      <div 
                        key={qr.id} 
                        onClick={() => handleSelectQuickReply(qr)}
                        className={cn(
                           "px-4 py-2 hover:bg-accent cursor-pointer transition-colors border-l-2 border-transparent hover:border-primary",
                           idx === 0 ? "bg-accent/30" : ""
                        )}
                      >
                        <div className="text-xs font-black text-primary mb-0.5">{qr.shortcut}</div>
                        <div className="text-xs text-muted-foreground truncate font-bold">{qr.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 bg-background/50 p-2 rounded-2xl border border-border focus-within:border-primary/50 transition-all shadow-sm">
                  <div className="flex gap-1 ml-2">
                    {/* Botones de adjuntos y emojis retirados temporalmente por no tener funcionalidad backend implementada */}
                  </div>
                  <Input 
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje... Usa '/' para respuestas rápidas" 
                    className="flex-1 bg-transparent border-none text-foreground focus-visible:ring-0 placeholder:text-muted-foreground font-bold"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSend}
                    disabled={!inputText.trim() || isSending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm mr-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
              </div>
            </div>
          </div>

          {/* COLUMNA 3: DETALLE DEL CONTACTO */}
          <div className="w-72 border-l border-border bg-card/40 flex flex-col h-full shrink-0">
            <div className="p-8 flex flex-col items-center border-b border-border text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-primary/80 to-primary rounded-3xl flex items-center justify-center font-black text-3xl text-primary-foreground italic mb-4 shadow-sm rotate-3">
                  {selectedChat.name?.[0] || '?'}
                </div>
                <h3 className="text-lg font-black text-foreground mb-1 uppercase tracking-wider">{selectedChat.name}</h3>
                
                {/* Visual Tags Placeholder */}
                <div className="flex flex-wrap items-center justify-center gap-1 mt-2">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    Cliente CRM
                  </span>
                  {(selectedChat as any).tags?.map((tag: string) => (
                    <span key={tag} className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
            </div>

            <div className="flex-1 p-6 space-y-8 overflow-auto">
                {/* 1. MÓDULO DE VENTAS Y EMBUDOS (ESTILO MERCATELY) */}
                <div className="space-y-4">
                   <h4 className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-border pb-2">
                     <DollarSign className="w-3.5 h-3.5" /> Negociación & Ventas
                   </h4>
                   
                   {/* Selector de Embudo */}
                   <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-muted-foreground uppercase">Etapa Kanban (Embudo)</label>
                       <select 
                          value={selectedChat.funnelStageId || ''}
                          onChange={handleChangeFunnelStage}
                          className="w-full text-xs font-bold p-2.5 bg-background border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                       >
                          <option value="">-- Sin asignar al embudo --</option>
                          {funnelStages.map(stage => (
                             <option key={stage.id} value={stage.id}>{stage.title}</option>
                          ))}
                       </select>
                   </div>

                   {/* Botón de Creación de Orden */}
                   <div className="pt-2">
                       <Button
                         onClick={() => setIsOrderModalOpen(true)}
                         variant="default"
                         className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] uppercase rounded-xl h-10 shadow-sm transition-all flex items-center justify-center gap-2">
                          <ShoppingCart className="w-4 h-4" /> Generar Pedido / Orden
                       </Button>
                       <p className="text-[9px] text-center text-muted-foreground mt-2 px-2 leading-tight">
                         Genera cotizaciones y links de pago desde el catálogo. Se enviarán nativamente al chat.
                       </p>
                   </div>
                </div>

                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">
                    <UserCheck className="w-3.5 h-3.5" /> Asignación
                  </h4>
                  <div className="flex justify-between items-center">
                     <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Agente Asignado</h4>
                     {selectedChat.assignedTo && (
                       <Button onClick={() => handleUpdateAssignment(false)} variant="ghost" className="h-5 px-2 text-[9px] text-destructive hover:bg-destructive/10">Desasignar</Button>
                     )}
                  </div>
                  {selectedChat.assignedTo ? (
                      <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <UserCheck className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-foreground">{selectedChat.assignedToName || 'Agente'}</p>
                            <p className="text-[10px] text-muted-foreground">Responsable actual</p>
                          </div>
                      </div>
                  ) : (
                      <div className="flex flex-col gap-2 items-center p-4 bg-muted/50 border border-dashed border-border rounded-xl text-center">
                          <p className="text-xs text-muted-foreground font-bold">Nadie está atendiendo este chat</p>
                          <Button onClick={() => handleUpdateAssignment(true)} variant="outline" className="w-full text-[10px] font-black uppercase border-primary/20 text-primary hover:bg-primary/10">
                            <UserPlus className="w-3 h-3 mr-2" /> Asignarme a Mí
                          </Button>
                      </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">
                    <Tag className="w-3.5 h-3.5" /> Datos de Contacto
                  </h4>
                  <div className="space-y-3">
                      <div className="flex items-center gap-3 text-foreground/80">
                        <div className="p-2 bg-accent rounded-lg"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                        <span className="text-xs font-bold">+{selectedChat.waId}</span>
                      </div>
                      <div className="flex items-center gap-3 text-foreground/80">
                        <div className="p-2 bg-accent rounded-lg"><Mail className="w-4 h-4 text-muted-foreground" /></div>
                        <span className="text-xs font-bold text-muted-foreground italic">Sin email registrado</span>
                      </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Notas Internas</h4>
                  <div className="flex flex-col gap-2">
                    <textarea 
                      value={noteText || (selectedChat as any).internalNote || ''}
                      onChange={(e) => setNoteText(e.target.value)}
                      onFocus={() => setIsNoteFocused(true)}
                      placeholder="Haz clic para añadir una nota sobre este contacto..."
                      className="p-4 bg-accent/30 rounded-2xl border border-dashed border-primary/20 text-[11px] font-bold text-foreground focus:outline-none focus:bg-background focus:border-solid focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none h-24"
                    />
                    {isNoteFocused && (
                       <div className="flex justify-end gap-2">
                         <Button onClick={() => setIsNoteFocused(false)} variant="ghost" className="h-7 text-[10px] font-black uppercase text-muted-foreground hover:bg-muted">Cancelar</Button>
                         <Button onClick={handleSaveNote} variant="default" className="h-7 text-[10px] font-black uppercase bg-primary hover:bg-primary/90">Grabar Nota</Button>
                       </div>
                    )}
                  </div>
                </div>
            </div>

            <div className="p-6 mt-auto flex flex-col gap-2">
                {selectedChat.status === 'closed' ? (
                   <Button onClick={() => handleUpdateStatus('open')} variant="outline" className="w-full bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground font-black text-xs uppercase rounded-xl transition-all h-12">
                     Reabrir Conversación
                   </Button>
                ) : (
                   <Button onClick={() => handleUpdateStatus('closed')} variant="outline" className="w-full bg-destructive/5 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground font-black text-xs uppercase rounded-xl transition-all h-12">
                     Cerrar Conversación
                   </Button>
                )}
            </div>
          </div>
        </>
      )}

      {/* ===== MODAL: Generar Pedido / Catálogo ===== */}
      <Dialog open={isOrderModalOpen} onOpenChange={v => { setIsOrderModalOpen(v); if (!v) setSelectedProductIds({}); }}>
        <DialogContent className="sm:max-w-md bg-background border-border text-foreground p-0 overflow-hidden">
          <div className="bg-emerald-500/10 p-5 border-b border-emerald-500/20">
            <DialogHeader>
              <DialogTitle className="text-lg font-black italic uppercase text-emerald-600 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Generar Pedido
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground mt-1">Selecciona productos del catálogo para generar un resumen de pedido en el chat.</p>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-auto">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay productos en el catálogo aún.<br/><a href="/crm/ventas" className="text-primary font-bold underline">Ir al catálogo</a></p>
            ) : products.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border hover:border-primary/30 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] font-bold text-emerald-600">${Number(p.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => toggleProductQty(p.id, -1)} className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all text-sm font-black">-</button>
                  <span className="w-6 text-center text-sm font-black text-foreground">{selectedProductIds[p.id] || 0}</span>
                  <button onClick={() => toggleProductQty(p.id, +1)} className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all text-sm font-black">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase">Total del pedido</p>
              <p className="text-xl font-black text-emerald-600">${orderTotal.toFixed(2)}</p>
            </div>
            <Button
              onClick={handleGenerateOrder}
              disabled={Object.keys(selectedProductIds).length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase rounded-xl h-10 px-6 disabled:opacity-40"
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" /> Enviar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
