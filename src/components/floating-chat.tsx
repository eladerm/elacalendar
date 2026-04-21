"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePathname } from 'next/navigation';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // No renderizar en la ruta de inicio de sesión o fuera del CRM
  const pathname = usePathname();
  if (!pathname.startsWith('/crm')) {
      return null;
  }

  // Cargar historial del Local Storage
  useEffect(() => {
    const savedMessages = localStorage.getItem('anythingllm_messages');
    const savedSessionId = localStorage.getItem('anythingllm_session_id');
    
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch(e) {}
    } else {
        // Mensaje de Bienvenida inicial
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: '¡Hola! Soy tu asistente IA de Elapiel entrenado con tus datos locales. ¿En qué te ayudo hoy?',
            timestamp: new Date().toISOString()
        }]);
    }
    
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  // Auto scroll down
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleClearHistory = () => {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '¡Hola! He limpiado mi memoria. ¿En qué te ayudo hoy?',
        timestamp: new Date().toISOString()
      }]);
      setSessionId(null);
      localStorage.removeItem('anythingllm_messages');
      localStorage.removeItem('anythingllm_session_id');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);
    localStorage.setItem('anythingllm_messages', JSON.stringify(newMessages));

    try {
      const res = await fetch('/api/anythingllm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId
        }),
      });

      if (!res.ok) throw new Error('Error al conectar con la IA');

      const data = await res.json();
      
      const assistantMessage: ChatMessage = {
        id: data.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.textResponse || 'Sin respuesta válida de AnythingLLM',
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      localStorage.setItem('anythingllm_messages', JSON.stringify(finalMessages));

      // Si la API nos devuelve un sessionId nuevo, lo guardamos para continuar el hilo
      if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem('anythingllm_session_id', data.sessionId);
      }

    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Hubo un error al contactar al servidor local de IA. Revisa tu consola.',
        timestamp: new Date().toISOString(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Botón Flotante */}
      <div className={cn("fixed z-50 transition-all duration-300", isOpen ? "bottom-5 right-5 md:bottom-8 md:right-8" : "bottom-5 right-5 hover:-translate-y-1")}>
        {!isOpen && (
            <Button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-tr from-primary to-green-400 text-white flex items-center justify-center p-0 border-4 border-background"
            >
              <Bot className="w-7 h-7" />
            </Button>
        )}

        {/* Ventana de Chat */}
        <div 
            className={cn(
                "bg-card border border-border shadow-2xl rounded-2xl flex flex-col transition-all origin-bottom-right duration-300",
                isOpen ? "opacity-100 scale-100 w-[90vw] sm:w-[380px] h-[550px] max-h-[85vh]" : "opacity-0 scale-90 w-0 h-0 overflow-hidden pointer-events-none"
            )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/50 rounded-t-2xl shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-xs">
                AI
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Asistente Local</h3>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 block"></span> AnythingLLM Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handleClearHistory} title="Limpiar Conversación" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
                </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
             <div className="flex flex-col gap-3 min-h-full justify-end pb-2">
                {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    msg.role === 'user'
                        ? "bg-primary text-primary-foreground self-end rounded-br-sm"
                        : "bg-muted text-foreground self-start rounded-bl-sm border"
                    )}
                >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                ))}
                {isTyping && (
                <div className="bg-muted text-foreground self-start rounded-2xl rounded-bl-sm px-4 py-2 text-sm border flex items-center gap-2 max-w-[85%]">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-muted-foreground text-xs font-medium">Escribiendo...</span>
                </div>
                )}
             </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 border-t bg-background shrink-0 rounded-b-2xl">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pregúntame algo..."
                className="rounded-xl border-border bg-muted/30 pr-10 focus-visible:ring-1"
                disabled={isTyping}
                autoComplete="off"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-1 bottom-1 h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
