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
  ArrowLeft
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';
import type { ChatThread as BaseChatThread, ChatMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ChatThread extends BaseChatThread {
  botPaused?: boolean;
}

type ChatStatus = 'abierto' | 'espera' | 'cerrado';

// Datos de demostración (se reemplazarán con datos reales de Firestore)
const demoConversations: ChatThread[] = [
  { id: '1', waId: '593912345678', name: 'Maria Jose', lastMessage: 'Quiero agendar para mañana...', lastTimestamp: new Date(), status: 'open', unreadCount: 2 },
  { id: '2', waId: '593987654321', name: 'Carlos Ruíz', lastMessage: 'Gracias, ya recibí el pago.', lastTimestamp: new Date(Date.now() - 3600000), status: 'pending', unreadCount: 0 },
  { id: '3', waId: '593955556666', name: 'Ana Belén', lastMessage: '¿Tienen disponibilidad en Matriz?', lastTimestamp: new Date(Date.now() - 86400000), status: 'closed', unreadCount: 0 },
];

const demoMessages: ChatMessage[] = [
  { id: '101', chatId: '1', from: 'business', to: '593912345678', body: '¡Hola! ¿En qué podemos ayudarte hoy? 😊', type: 'text', status: 'read', timestamp: new Date(Date.now() - 3600000 * 2), isIncoming: false },
  { id: '102', chatId: '1', from: '593912345678', to: 'business', body: 'Hola, quiero agendar una cita para depilación láser en la sucursal del Valle.', type: 'text', status: 'delivered', timestamp: new Date(Date.now() - 3600000), isIncoming: true },
  { id: '103', chatId: '1', from: 'business', to: '593912345678', body: 'Perfecto Maria. ¿Te parece bien mañana a las 10:00 AM?', type: 'text', status: 'delivered', timestamp: new Date(Date.now() - 1800000), isIncoming: false },
  { id: '104', chatId: '1', from: '593912345678', to: 'business', body: '¡Sí, me queda genial! ¿Qué costo tiene la sesión?', type: 'text', status: 'delivered', timestamp: new Date(Date.now() - 300000), isIncoming: true },
];

const statusIcon = (s: ChatMessage['status']) => {
  if (s === 'read') return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (s === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
  if (s === 'sent') return <Check className="w-3.5 h-3.5 text-slate-500" />;
  return <Clock className="w-3 h-3 text-slate-600" />;
};

const formatTime = (d: Date) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

const getFlagEmoji = (countryCode?: string) => {
  if (!countryCode) return '🌎';
  return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export default function CRMChatPage() {
  const { toast } = useToast();
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeFilter, setActiveFilter] = useState<ChatStatus>('abierto');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
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
      handleSend();
    }
  };

  const filteredChats = chats.filter(c => {
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
        await updateDoc(doc(db, 'crm_chats', selectedChat.id), { botPaused: pause });
        toast({ title: pause ? 'Bot pausado. Chat transferido a Humano.' : 'Bot reactivado exitosamente.' });
        setSelectedChat({...selectedChat, botPaused: pause});
      } catch (err) {
        toast({ title: 'Error al cambiar estado del bot', variant: 'destructive' });
      }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-[#1e293b]/20 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500">
      
      {/* COLUMNA 1: LISTA DE CONVERSACIONES */}
      <div className="w-80 border-r border-slate-700/50 bg-[#1e293b]/40 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex justify-between items-center mb-4">
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-emerald-500" onClick={() => window.location.href = '/'}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-black text-white italic uppercase tracking-wider">Chats</h2>
            </div>
  
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-emerald-400">
               <Filter className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
               placeholder="Buscar cliente..." 
               className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500 rounded-xl font-bold"
            />
          </div>

          <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
             {(['abierto', 'espera', 'cerrado'] as ChatStatus[]).map(f => (
               <button 
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    activeFilter === f ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
                  )}
               >
                 {f}
               </button>
             ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto divide-y divide-slate-700/20">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Sin conversaciones en este estado</p>
            </div>
          ) : filteredChats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={cn(
                "p-4 flex items-center gap-4 cursor-pointer transition-all border-l-4",
                selectedChat?.id === chat.id 
                  ? "bg-slate-800 border-emerald-500" 
                  : "bg-transparent border-transparent hover:bg-slate-800/40"
              )}
            >
              <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center shrink-0 font-black text-white uppercase italic border-2 border-slate-700/50">
                {chat.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                   <h3 className="text-sm font-black text-white truncate flex items-center gap-1">
                      {getFlagEmoji(chat.countryCode)} {chat.name}
                   </h3>
                   <span className="text-[9px] font-black text-slate-500 uppercase">
                     {chat.lastTimestamp instanceof Date ? formatTime(chat.lastTimestamp) : ''}
                   </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5 font-bold">{chat.lastMessage}</p>
              </div>
              {(chat.unreadCount ?? 0) > 0 && (
                <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg animate-pulse">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* COLUMNA 2 & 3: ÁREA DE MENSAJES Y DETALLE */}
      {!selectedChat ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0f172a] h-full">
            <MessageCircle className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-black text-slate-500 uppercase tracking-widest">Selecciona un chat</h3>
            <p className="text-sm text-slate-600 mt-2">Los mensajes aparecerán aquí</p>
        </div>
      ) : (
        <>
          {/* COLUMNA 2: ÁREA DE MENSAJES */}
          <div className="flex-1 flex flex-col h-full bg-[#0f172a] relative">
            {/* Header del Chat: Action Console */}
            <div className="p-4 border-b border-slate-700/50 bg-[#1e293b]/40 flex justify-between items-center backdrop-blur-md">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center font-black text-white italic">
                    {selectedChat.name?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                       <span className="text-lg">{getFlagEmoji(selectedChat.countryCode)}</span>
                       {selectedChat.name}
                       <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-widest">
                          {selectedChat.status === 'open' ? 'Abierto' : selectedChat.status === 'pending' ? 'Espera' : 'Cerrado'}
                       </span>
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", selectedChat.status === 'open' ? "bg-emerald-500 animate-pulse" : "bg-slate-500")} />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">+{selectedChat.waId}</span>
                        {selectedChat.botPaused && (
                           <span className="ml-2 text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 uppercase font-black">Bot Pausado</span>
                        )}
                    </div>
                  </div>
              </div>
              <div className="flex gap-2">
                  {!selectedChat.botPaused ? (
                    <Button onClick={() => handleToggleBot(true)} variant="outline" className="border-slate-700 text-slate-400 hover:text-emerald-400 font-bold text-[10px] uppercase h-9 rounded-xl">
                        <span className="flex items-center gap-2">Pausar Bot & Transferir <ArrowLeft className="w-3 h-3 rotate-180"/></span>
                    </Button>
                  ) : (
                    <Button onClick={() => handleToggleBot(false)} variant="outline" className="border-slate-700 text-slate-400 hover:text-white bg-slate-800 font-bold text-[10px] uppercase h-9 rounded-xl">
                        <span className="flex items-center gap-2">Reactivar Bot <MessageCircle className="w-3 h-3"/></span>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white"><MoreVertical className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="flex flex-col gap-4">
                  {messages.map((m) => (
                    <div key={m.id} className={cn(
                      "flex flex-col max-w-[78%]",
                      m.isIncoming ? "mr-auto items-start" : "ml-auto items-end"
                    )}>
                      <div className={cn(
                          "p-4 rounded-2xl text-sm font-bold shadow-xl relative",
                          m.isIncoming 
                            ? "bg-[#1e293b]/40 text-white rounded-tl-none border border-slate-700/50" 
                            : "bg-emerald-500 text-white rounded-tr-none"
                      )}>
                          {m.body}
                          <div className={cn(
                            "flex items-center gap-1 mt-2 text-[10px]",
                            m.isIncoming ? "text-slate-500" : "text-emerald-500-foreground/60 justify-end"
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

            {/* Input */}
            <div className="p-4 bg-[#1e293b]/40 backdrop-blur-md border-t border-slate-700/50">
              <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50 focus-within:border-emerald-500/50 transition-all">
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-emerald-400"><Smile className="w-5 h-5" /></Button>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-emerald-400"><Paperclip className="w-5 h-5" /></Button>
                  </div>
                  <Input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..." 
                    className="flex-1 bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-slate-600 font-bold"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSend}
                    disabled={!inputText.trim() || isSending}
                    className="bg-emerald-500 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 mr-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
              </div>
            </div>
          </div>

          {/* COLUMNA 3: DETALLE DEL CONTACTO */}
          <div className="w-72 border-l border-slate-700/50 bg-[#1e293b]/40 flex flex-col h-full shrink-0">
            <div className="p-8 flex flex-col items-center border-b border-slate-700/50 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl flex items-center justify-center font-black text-3xl text-white italic mb-4 shadow-2xl shadow-emerald-500/20 rotate-3">
                  {selectedChat.name?.[0] || '?'}
                </div>
                <h3 className="text-lg font-black text-white mb-1 uppercase tracking-wider">{selectedChat.name}</h3>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Cliente CRM
                </span>
            </div>

            <div className="flex-1 p-6 space-y-8 overflow-auto">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Información</h4>
                  <div className="space-y-3">
                      <div className="flex items-center gap-3 text-slate-300">
                        <div className="p-2 bg-slate-800 rounded-lg"><Phone className="w-4 h-4 text-slate-400" /></div>
                        <span className="text-xs font-bold">+{selectedChat.waId}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-300">
                        <div className="p-2 bg-slate-800 rounded-lg"><Mail className="w-4 h-4 text-slate-400" /></div>
                        <span className="text-xs font-bold text-slate-500 italic">Sin email registrado</span>
                      </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas Internas</h4>
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700/50 cursor-pointer hover:border-slate-700/50 transition-colors">
                      <p className="text-[11px] font-bold text-slate-500 italic">Haz clic para añadir una nota sobre este contacto...</p>
                  </div>
                </div>
            </div>

            <div className="p-6 mt-auto flex flex-col gap-2">
                {selectedChat.status === 'closed' ? (
                   <Button onClick={() => handleUpdateStatus('open')} variant="outline" className="w-full bg-emerald-500/5 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white font-black text-xs uppercase rounded-xl transition-all h-12">
                     Reabrir Conversación
                   </Button>
                ) : (
                   <Button onClick={() => handleUpdateStatus('closed')} variant="outline" className="w-full bg-red-500/5 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white font-black text-xs uppercase rounded-xl transition-all h-12">
                     Cerrar Conversación
                   </Button>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
