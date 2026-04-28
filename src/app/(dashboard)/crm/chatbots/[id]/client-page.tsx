"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ReactFlow, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, Node, Edge, NodeChange, EdgeChange, Connection, BackgroundVariant, Panel, ReactFlowProvider, useReactFlow, useViewport, NodeToolbar as XYNodeToolbar, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, PlayCircle, MessageSquare, Zap, Clock, GitBranch, LayoutList, Tag, UserPlus, Database, Image, CalendarClock, Maximize2, Minimize2, ZoomIn, ZoomOut, Trash2, LayoutTemplate, ListPlus, Plus, X, UserCheck, CheckCircle2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import dagre from 'dagre';
import { db } from '@/lib/firebase';
import type { ChatbotConfig } from '@/lib/types'
import { TriggerNode, MessageNode, OptionNode, ButtonMessageNode, WaitNode, ConditionNode, TagNode, AssignNode, CaptureNode, MediaNode, TimeRoutingNode, ApiCallNode, CloseTicketNode, BotHandoffNode } from './custom-nodes';
import { NodeConfigPanel } from './NodeConfigPanel';

export type ChatMessage = {
  id: string;
  sender: 'bot' | 'user' | 'system';
  nodeId?: string;
  text?: string;
};

// ── Health analysis ──────────────────────────────────────────────────────
type HealthStatus = 'ok' | 'warning' | 'error' | 'neutral';
const VALID_ENDPOINTS = new Set(['closeTicket', 'botHandoff']);
const DECISION_NODES  = new Set(['condition', 'option', 'buttonMessage', 'timeRouting']);

function isNodeConfigured(n: Node): boolean {
  if (!n.data) return false;
  const d = n.data as any;
  switch (n.type) {
    case 'message': return !!d.label && d.label !== 'Nuevo Mensaje';
    case 'buttonMessage': return !!d.label && d.label !== 'Escribe tu mensaje aquí...' && Array.isArray(d.buttons) && d.buttons.length > 0;
    case 'capture': return !!d.crmField;
    case 'condition': return !!d.condition;
    case 'option': return Array.isArray(d.options) && d.options.length > 0;
    case 'assign': return !!d.department;
    case 'media': return !!d.mediaUrl;
    case 'wait': return !!d.seconds;
    default: return true; // Other types don't require specific config by default
  }
}

function computeNodeHealth(nodes: Node[], edges: Edge[]): Record<string, HealthStatus> {
  const result: Record<string, HealthStatus> = {};
  nodes.forEach(n => {
    const incoming = edges.filter(e => e.target === n.id).length;
    const outgoing = edges.filter(e => e.source === n.id).length;
    const configured = isNodeConfigured(n);

    if (!configured) {
      result[n.id] = 'error';
      return;
    }

    if (n.type === 'trigger') {
      result[n.id] = outgoing > 0 ? 'ok' : 'warning';
    } else if (VALID_ENDPOINTS.has(n.type || '')) {
      result[n.id] = incoming > 0 ? 'ok' : 'error';
    } else if (DECISION_NODES.has(n.type || '')) {
      if (incoming === 0) result[n.id] = 'error';        // orphan
      else if (outgoing === 0) result[n.id] = 'warning';  // no path out
      else result[n.id] = 'ok';
    } else {
      // Regular node
      if (incoming === 0) result[n.id] = 'error';         // orphan
      else if (outgoing === 0) result[n.id] = 'warning';   // dead end
      else result[n.id] = 'ok';
    }
  });
  return result;
}

// ── Traveling bubble ─────────────────────────────────────────────────────
function FlowBubble({ nodes, simPath, simStep }: { nodes: Node[]; simPath: string[]; simStep: number }) {
  const { x: vpX, y: vpY, zoom } = useViewport();
  const activeId = simPath[simStep];
  const activeNode = nodes.find(n => n.id === activeId);
  if (!activeNode || simStep < 0) return null;

  // node positions are in flow-space; convert to screen-space
  const nodeW = 300;
  const nodeH = 100;
  const sx = activeNode.position.x * zoom + vpX + (nodeW * zoom) / 2;
  const sy = activeNode.position.y * zoom + vpY + (nodeH * zoom) / 2;

  return (
    <div
      className="absolute pointer-events-none z-[9999]"
      style={{ left: sx - 8, top: sy - 8, transition: 'left 0.8s cubic-bezier(.4,0,.2,1), top 0.8s cubic-bezier(.4,0,.2,1)' }}
    >
      {/* Core */}
      <div className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_0_3px_rgba(16,185,129,0.3),0_0_12px_4px_rgba(16,185,129,0.5)]" />
      {/* Ping ring */}
      <div className="absolute inset-0 w-4 h-4 rounded-full bg-emerald-400 opacity-60 animate-ping" />
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  option: OptionNode,
  buttonMessage: ButtonMessageNode,
  wait: WaitNode,
  condition: ConditionNode,
  tag: TagNode,
  assign: AssignNode,
  capture: CaptureNode,
  media: MediaNode,
  timeRouting: TimeRoutingNode,
  apiCall: ApiCallNode,
  closeTicket: CloseTicketNode,
  botHandoff: BotHandoffNode
};

const initialNodes: Node[] = [
  { id: '1', type: 'trigger', data: { label: 'Palabra: hola' }, position: { x: 50, y: 150 } },
  { id: '2', type: 'message', data: { label: '¡Hola! Bienvenido a élapiel. ¿En qué puedo ayudarte hoy?' }, position: { x: 400, y: 150 } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'straight', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
];

// ── Draggable Phone Component ───────────────────────────────────────────
function DraggablePhone({ 
  isSimulating, 
  nodes, 
  chatMessages,
  handleChatInput,
  isWaitingForInput
}: { 
  isSimulating: boolean; 
  nodes: Node[]; 
  chatMessages: ChatMessage[];
  handleChatInput: (text: string) => void;
  isWaitingForInput: boolean;
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setPosition({ x: window.innerWidth - 320, y: 120 });
    setMounted(true);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isSimulating]);

  if (!mounted) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: position.x, initY: position.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: dragRef.current.initX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.initY + (e.clientY - dragRef.current.startY)
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (isMinimized) {
    return (
      <div 
        style={{ left: position.x, top: position.y }}
        className="fixed z-[100] cursor-grab active:cursor-grabbing bg-emerald-500 text-white rounded-full p-4 shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:bg-emerald-600 transition-colors flex items-center justify-center"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      >
        <MessageSquare className="w-6 h-6 pointer-events-none" />
        <button 
          onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} 
          className="absolute -top-1 -right-1 bg-white text-emerald-600 rounded-full p-0.5 shadow-sm border border-emerald-100 hover:scale-110 transition-transform cursor-pointer"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div 
      style={{ left: position.x, top: position.y }}
      className="fixed z-[100] w-[280px] bg-white rounded-[2.5rem] border-[8px] border-slate-200 shadow-2xl flex flex-col overflow-hidden"
    >
      <div 
        className="absolute top-0 inset-x-0 h-6 bg-slate-200 rounded-b-xl max-w-[120px] mx-auto z-20 cursor-grab active:cursor-grabbing flex items-center justify-center hover:bg-slate-300 transition-colors"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      >
        <div className="w-10 h-1 bg-slate-400/30 rounded-full pointer-events-none" />
      </div>
      <button 
        onClick={() => setIsMinimized(true)} 
        className="absolute top-8 right-3 z-30 bg-white/20 hover:bg-white/40 text-white p-1.5 rounded-full transition-colors backdrop-blur-md cursor-pointer shadow-sm"
      >
        <Minimize2 className="w-3.5 h-3.5" />
      </button>
      <div className="bg-[#00a884] h-16 flex items-center px-4 gap-3 shrink-0 pt-4 z-10">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow overflow-hidden p-1">
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Bot" alt="Bot" className="w-full h-full object-cover" />
        </div>
        <div>
          <span className="text-white font-semibold text-[13px] block">Elapiel Bot</span>
          <span className="text-white/80 text-[10px]">en línea</span>
        </div>
      </div>
      <div className="h-[440px] bg-[#efeae2] p-3 space-y-3 z-0 overflow-y-auto flex flex-col scrollbar-thin" style={{ backgroundImage: 'radial-gradient(#d1c7bc 1px, transparent 0)', backgroundSize: '16px 16px' }}>
        <div className="flex justify-center"><span className="bg-white text-slate-500 text-[10px] px-3 py-1 rounded-lg shadow-sm">hoy</span></div>
        
        {/* Render dynamic chat history from simulation state */}
        {!isSimulating && (
           <div className="text-center text-xs text-slate-400 mt-4 bg-white/60 p-2 rounded-xl backdrop-blur-sm mx-4">
              Haz clic en "Simular Flujo" para ver la prueba interactiva.
           </div>
        )}

        {isSimulating && chatMessages.length === 0 && isWaitingForInput && (
           <div className="text-center text-xs text-slate-500 mt-4 bg-emerald-50 border border-emerald-100 p-3 rounded-xl backdrop-blur-sm mx-4 shadow-sm animate-in fade-in slide-in-from-top-2">
              💡 Simulación iniciada.<br/>Escribe la palabra clave del gatillo para comenzar.
           </div>
        )}

        {isSimulating && chatMessages.map((msg, index) => {
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          if (msg.sender === 'user') {
             return (
               <div key={msg.id} className="bg-[#d9fdd3] text-slate-800 text-[13px] px-2.5 py-2 rounded-xl rounded-tr-none ml-auto w-fit max-w-[85%] shadow-sm animate-in fade-in slide-in-from-bottom-2">
                 {msg.text}
                 <div className="text-[9px] text-slate-500 text-right mt-0.5">{time}</div>
               </div>
             );
          }
          
          if (msg.sender === 'system') {
             return (
               <div key={msg.id} className="mx-auto w-fit max-w-[80%] bg-slate-200/60 backdrop-blur-sm text-slate-500 text-[10px] font-medium px-3 py-1 rounded-full shadow-sm my-1 animate-in zoom-in duration-300">
                 {msg.text}
               </div>
             );
          }

          // Bot messages tied to a node
          const node = nodes.find(n => n.id === msg.nodeId);
          if (!node) return null;

          let content: React.ReactNode = null;
          if (node.type === 'message') {
             content = node.data?.label as string || '...';
          } else if (node.type === 'buttonMessage') {
             const btns = (node.data?.buttons as string[]) || [];
             content = (
               <div className="flex flex-col gap-2">
                 <span>{node.data?.label as string || 'Elija una opción:'}</span>
                 <div className="flex flex-col gap-1.5 mt-1">
                   {btns.map((b, i) => (
                     <div key={i} onClick={() => { if(isWaitingForInput && index === chatMessages.length - 1) handleChatInput(b); }} className={`bg-[#f0f2f5] text-blue-600 font-medium text-center py-1.5 rounded-lg border border-slate-200/50 transition-colors ${isWaitingForInput && index === chatMessages.length - 1 ? 'cursor-pointer hover:bg-slate-100' : 'opacity-70'}`}>{b}</div>
                   ))}
                 </div>
               </div>
             );
          } else if (node.type === 'option') {
             const opts = (node.data?.options as string[]) || [];
             content = (
               <div className="flex flex-col gap-2">
                 <span>Menú de opciones:</span>
                 <ul className="list-decimal pl-5 space-y-1 text-slate-700">
                   {opts.map((o, i) => <li key={i} className="font-medium">{o}</li>)}
                 </ul>
               </div>
             );
          } else if (node.type === 'capture') {
             content = <span className="italic">{node.data?.question as string || '¿Cuál es tu dato?'}</span>;
          } else if (node.type === 'media') {
             content = (
               <div className="flex items-center gap-2 text-slate-500 bg-slate-100 p-2 rounded-lg border border-slate-200">
                 <Image className="w-5 h-5 text-emerald-500" />
                 <span className="italic text-xs font-medium">📷 Imagen adjunta</span>
               </div>
             );
          } else if (node.type === 'wait') {
             content = <span className="italic text-slate-400">⏳ Pausa de {node.data?.seconds}s...</span>;
          } else if (node.type === 'closeTicket' || node.type === 'botHandoff') {
             content = <span className="font-semibold text-emerald-600">✅ Chat Resuelto / Transferido</span>;
          } else if (node.type === 'apiCall' || node.type === 'timeRouting' || node.type === 'condition' || node.type === 'assign' || node.type === 'tag') {
             return (
               <div key={msg.id} className="mx-auto w-fit max-w-[80%] bg-slate-200/60 backdrop-blur-sm text-slate-500 text-[10px] font-medium px-3 py-1 rounded-full shadow-sm my-1 animate-in zoom-in duration-300">
                 ⚙️ Acción: {node.type}
               </div>
             );
          }

          if (!content) return null;

          return (
            <div key={msg.id} className="bg-white text-slate-800 text-[13px] px-2.5 py-2 rounded-xl rounded-tl-none w-fit max-w-[85%] shadow-sm animate-in fade-in slide-in-from-bottom-2">
              {content}
              <div className="text-[9px] text-slate-400 text-right mt-0.5">{time}</div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          if (inputValue.trim()) {
            handleChatInput(inputValue);
            setInputValue('');
          }
        }}
        className="bg-[#f0f2f5] px-2 py-3 flex items-center gap-2 z-10 border-t border-slate-200 shrink-0"
      >
        <input 
          disabled={!isSimulating || (!isWaitingForInput && chatMessages.length > 0)}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={isSimulating ? (isWaitingForInput ? "Escribe aquí..." : "Escribiendo...") : 'Inicia simulación para probar...'}
          className="flex-1 bg-white rounded-full h-10 px-4 text-slate-700 text-[13px] shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
        />
        <button 
          type="submit" 
          disabled={!isSimulating || (!isWaitingForInput && chatMessages.length > 0) || !inputValue.trim()}
          className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors shrink-0"
        >
          <PlayCircle className="w-5 h-5 ml-0.5" />
        </button>
      </form>
    </div>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────
function NodeToolbar({ onAdd }: { onAdd: (type: string) => void }) {
  const [isMinimized, setIsMinimized] = useState(false);

  const items = [
    { type: 'message', icon: <MessageSquare className="w-4 h-4"/>, label: 'Mensaje Texto', color: 'text-blue-500', bg: 'bg-blue-50/90' },
    { type: 'buttonMessage', icon: <LayoutList className="w-4 h-4"/>, label: 'Mensaje Botones', color: 'text-blue-600', bg: 'bg-blue-50/90' },
    { type: 'option', icon: <ListPlus className="w-4 h-4"/>, label: 'Menú Múltiple', color: 'text-amber-500', bg: 'bg-amber-50/90' },
    { type: 'capture', icon: <Database className="w-4 h-4"/>, label: 'Capturar Dato', color: 'text-pink-500', bg: 'bg-pink-50/90' },
    { type: 'media', icon: <Image className="w-4 h-4"/>, label: 'Enviar Media', color: 'text-cyan-500', bg: 'bg-cyan-50/90' },
    { type: 'wait', icon: <Clock className="w-4 h-4"/>, label: 'Pausar Flujo', color: 'text-slate-500', bg: 'bg-white/90' },
    { type: 'condition', icon: <GitBranch className="w-4 h-4"/>, label: 'Regla / Condición', color: 'text-emerald-500', bg: 'bg-emerald-50/90' },
    { type: 'timeRouting', icon: <CalendarClock className="w-4 h-4"/>, label: 'Horario Laboral', color: 'text-orange-500', bg: 'bg-orange-50/90' },
    { type: 'apiCall', icon: <LayoutTemplate className="w-4 h-4"/>, label: 'API Externa', color: 'text-fuchsia-500', bg: 'bg-fuchsia-50/90' },
    { type: 'tag', icon: <Tag className="w-4 h-4"/>, label: 'Añadir Etiqueta', color: 'text-purple-500', bg: 'bg-purple-50/90' },
    { type: 'assign', icon: <UserPlus className="w-4 h-4"/>, label: 'Asignar Agente', color: 'text-indigo-500', bg: 'bg-indigo-50/90' },
    { type: 'botHandoff', icon: <UserPlus className="w-4 h-4"/>, label: 'Pasar a Humano', color: 'text-orange-600', bg: 'bg-orange-50/90' },
    { type: 'closeTicket', icon: <Trash2 className="w-4 h-4"/>, label: 'Resolver Chat', color: 'text-red-500', bg: 'bg-red-50/90' },
  ];

  if (isMinimized) {
    return (
      <div className="py-2 px-1 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="relative flex items-center justify-center bg-emerald-500 text-white h-14 w-14 rounded-full shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:bg-emerald-600 hover:scale-105 transition-all"
        >
          <Plus className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 bg-white text-emerald-600 rounded-full p-1 shadow-sm border border-emerald-100">
            <Maximize2 className="w-3 h-3" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 py-2 px-1 z-50">
      <button
        onClick={() => setIsMinimized(true)}
        title="Minimizar Herramientas"
        className="flex items-center justify-center bg-white/80 backdrop-blur-md border border-slate-200/60 text-slate-400 hover:text-slate-700 h-9 w-11 rounded-2xl mb-1 shadow-sm hover:shadow hover:bg-white transition-all"
      >
        <Minimize2 className="w-4 h-4" />
      </button>

      {items.map(({ type, icon, label, color, bg }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          title={`Agregar: ${label}`}
          className={`group relative flex items-center justify-start gap-3 text-slate-700 hover:text-slate-900 ${bg} text-[13px] font-semibold h-11 w-11 hover:w-[180px] rounded-2xl transition-all duration-300 ease-in-out shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 border border-white/60 backdrop-blur-md overflow-hidden px-[13px] shrink-0`}
        >
          <span className={`${color} shrink-0`}>{icon}</span>
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Inner component that uses useReactFlow (must be inside Provider) ────
function FlowInner({ chatbotId }: { chatbotId: string }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [botConfig, setBotConfig] = useState<ChatbotConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simPath, setSimPath] = useState<string[]>([]);  // ordered node ids traversed
  const [simStep, setSimStep] = useState(-1);            // current step index
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simPathRef = useRef<string[]>([]); // always-fresh copy to avoid stale closures
  const nodesRef = useRef<typeof nodes>(nodes);
  const simStepRef = useRef<number>(-1);   // always-fresh step to avoid StrictMode double-invoke

  const router = useRouter();

  // Keep refs in sync
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { simPathRef.current = simPath; }, [simPath]);
  useEffect(() => { simStepRef.current = simStep; }, [simStep]);

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  // Load chatbot data
  useEffect(() => {
    async function loadBot() {
      try {
        const docRef = doc(db, 'crm_chatbots', chatbotId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data() as ChatbotConfig;
          setBotConfig(data);

          // Nodes/edges may be stored as JSON strings (e.g. from MCP injection) or as arrays
          const parseField = (field: any): any[] => {
            if (!field) return [];
            if (typeof field === 'string') {
              try { return JSON.parse(field); } catch { return []; }
            }
            return Array.isArray(field) ? field : [];
          };

          const parsedNodes = parseField(data.nodes);
          const parsedEdges = parseField(data.edges);
          let finalNodes = parsedNodes;
          let finalEdges = parsedEdges;
          
          if (finalNodes.length > 0) {
            // Apply vertical auto-layout on load
            const dagreGraph = new dagre.graphlib.Graph();
            dagreGraph.setDefaultEdgeLabel(() => ({}));
            dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 100 });

            finalNodes.forEach((node: Node) => {
              dagreGraph.setNode(node.id, { width: 350, height: 100 });
            });

            finalEdges.forEach((edge: Edge) => {
              dagreGraph.setEdge(edge.source, edge.target);
            });

            dagre.layout(dagreGraph);

            finalNodes = finalNodes.map((node: Node) => {
              const nodeWithPosition = dagreGraph.node(node.id);
              if (nodeWithPosition) {
                return {
                  ...node,
                  position: {
                    x: nodeWithPosition.x - 350 / 2,
                    y: nodeWithPosition.y - 100 / 2,
                  },
                };
              }
              return node;
            });
            setNodes(finalNodes);
          }
          if (finalEdges.length > 0) {
            // Ensure all edges are straight
            finalEdges = finalEdges.map((e: Edge) => ({ ...e, type: 'straight' }));
            setEdges(finalEdges);
          }
        }
      } catch (e) {
        console.error('Error cargando bot:', e);
      }
    }
    loadBot();
  }, [chatbotId]);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  // Fit view when entering fullscreen (60% zoom)
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.3, duration: 400, maxZoom: 0.6 });
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen, fitView]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => setNodes(nds => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  );

  const isValidConnection = useCallback((connection: Edge | Connection) => {
    // Top-down strict tree: target must not have any other incoming edge
    const isTargetAlreadyConnected = edges.some(e => e.target === connection.target);
    return !isTargetAlreadyConnected;
  }, [edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({ ...params, animated: true, type: 'straight', style: { stroke: '#10b981', strokeWidth: 2 } }, eds)),
    []
  );

  const onLayout = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 100 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 350, height: 100 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 350 / 2,
          y: nodeWithPosition.y - 100 / 2,
        },
      };
    });

    setNodes(layoutedNodes);
    window.requestAnimationFrame(() => fitView({ padding: 0.3, duration: 800, maxZoom: 1 }));
  }, [nodes, edges, fitView]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'crm_chatbots', chatbotId);
      await updateDoc(docRef, { nodes, edges });
      setIsDirty(false);
      setLastSaved(new Date());
    } catch (e) {
      console.error('Error guardando:', e);
      alert('Error al guardar el flujo. Verifica tu conexión.');
    } finally {
      setIsSaving(false);
    }
  }, [chatbotId, nodes, edges, isSaving]);

  // Auto-save with 2s debounce after any change
  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    setIsDirty(true);
    const t = setTimeout(() => { handleSave(); }, 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Ctrl+S / Cmd+S manual save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleDelete = useCallback(async () => {
    if (confirm('¿Estás seguro de que deseas eliminar este flujo? Esta acción no se puede deshacer.')) {
      setIsSaving(true);
      try {
        const docRef = doc(db, 'crm_chatbots', chatbotId);
        await deleteDoc(docRef);
        router.push('/crm/chatbots');
      } catch (e) {
        console.error('Error eliminando flujo:', e);
        alert('Error al eliminar el flujo.');
        setIsSaving(false);
      }
    }
  }, [chatbotId, router]);

  const addNode = useCallback((type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      position: { x: 250 + Math.random() * 100, y: 200 + nodes.length * 30 },
      data: {
        label: type === 'message' ? 'Nuevo Mensaje'
             : type === 'trigger' ? 'hola, info'
             : type === 'buttonMessage' ? 'Escribe tu mensaje aquí...'
             : undefined,
        options:     type === 'option'       ? ['Sí', 'No'] : undefined,
        buttons:     type === 'buttonMessage'? ['Opción 1', 'Opción 2'] : undefined,
        seconds:     type === 'wait'         ? 60 : undefined,
        condition:   type === 'condition'    ? '' : undefined,
        tags:        type === 'tag'          ? [] : undefined,
        department:  type === 'assign'       ? '' : undefined,
        question:    type === 'capture'      ? '¿Cuál es tu dato?' : undefined,
        crmField:    type === 'capture'      ? '' : undefined,
        mediaUrl:    type === 'media'        ? '' : undefined,
      },
    };
    setNodes(nds => [...nds, newNode]);
  }, [nodes.length]);

  const addNodeConnected = useCallback((type: string, parentId: string) => {
    // Work with fresh snapshots of nodes/edges via setter functions
    let nextNodes: Node[] = [];
    let nextEdges: Edge[] = [];

    setNodes(currentNodes => {
      const parentNode = currentNodes.find(n => n.id === parentId);
      if (!parentNode) { nextNodes = currentNodes; return currentNodes; }

      const newNodeId = `${type}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: type as any,
        position: { x: parentNode.position.x, y: parentNode.position.y + 200 },
        selected: true,
        data: {
          label: type === 'message' ? 'Nuevo Mensaje'
               : type === 'trigger' ? 'hola, info'
               : type === 'buttonMessage' ? 'Escribe tu mensaje aquí...'
               : undefined,
          options:    type === 'option'        ? ['Sí', 'No'] : undefined,
          buttons:    type === 'buttonMessage' ? ['Opción 1', 'Opción 2'] : undefined,
          seconds:    type === 'wait'          ? 60 : undefined,
          condition:  type === 'condition'     ? '' : undefined,
          tags:       type === 'tag'           ? [] : undefined,
          department: type === 'assign'        ? '' : undefined,
          question:   type === 'capture'       ? '¿Cuál es tu dato?' : undefined,
          crmField:   type === 'capture'       ? '' : undefined,
          mediaUrl:   type === 'media'         ? '' : undefined,
        },
      };

      nextNodes = [...currentNodes.map(n => ({ ...n, selected: false })), newNode];
      return nextNodes;
    });

    setEdges(currentEdges => {
      const newNodeId = nextNodes[nextNodes.length - 1]?.id;
      if (!newNodeId) return currentEdges;

      const newEdge: Edge = {
        id: `e${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        type: 'straight',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 }
      };
      nextEdges = [...currentEdges, newEdge];

      // Run dagre layout on the combined arrays
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 });
      nextNodes.forEach(n => dagreGraph.setNode(n.id, { width: 320, height: 120 }));
      nextEdges.forEach(e => dagreGraph.setEdge(e.source, e.target));
      dagre.layout(dagreGraph);

      const laidOut = nextNodes.map(n => {
        const pos = dagreGraph.node(n.id);
        return { ...n, position: { x: pos.x - 160, y: pos.y - 60 } };
      });

      // Apply laid-out nodes
      setNodes(laidOut);

      // Select the new node so config panel opens
      const newNodeId2 = laidOut[laidOut.length - 1]?.id;
      if (newNodeId2) setTimeout(() => setSelectedNodeId(newNodeId2), 50);

      return nextEdges;
    });
  }, [setNodes, setEdges, setSelectedNodeId]);

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: newData } : n));
  }, []);

  const closePanel = useCallback(() => {
    setSelectedNodeId(null);
    setNodes(nds => nds.map(n => ({ ...n, selected: false })));
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    if (selectedNodeId === id) {
      closePanel();
    }
  }, [setNodes, setEdges, selectedNodeId, closePanel]);

  // ── Interactive Simulation Engine ──────────────────────────────────────
  const stopSimulation = useCallback(() => {
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    setIsSimulating(false);
    setSimPath([]);
    setSimStep(-1);
    setChatMessages([]);
    setIsWaitingForInput(false);
  }, []);

  const processNextNode = useCallback((currentStep: number, currentPath: string[]) => {
    if (currentStep >= currentPath.length) {
      setTimeout(() => stopSimulation(), 3000);
      return;
    }

    const nodeId = currentPath[currentStep];
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;

    if (!isNodeConfigured(node)) {
       setSimStep(currentStep);
       return;
    }

    if (node.type !== 'trigger') {
       const msgId = `bot-${nodeId}-${currentStep}`;
       setChatMessages(prev => {
         // Dedup: don't add if already present (StrictMode safety)
         if (prev.some(m => m.id === msgId)) return prev;
         return [...prev, { id: msgId, sender: 'bot', nodeId }];
       });
    }
    setSimStep(currentStep);

    if (['capture', 'buttonMessage', 'option'].includes(node.type)) {
      setIsWaitingForInput(true);
      return;
    }

    simTimerRef.current = setTimeout(() => {
      processNextNode(currentStep + 1, currentPath);
    }, 1100);
  }, [stopSimulation]);

  const runSimulation = useCallback(() => {
    if (isSimulating) { stopSimulation(); return; }

    const buildPath = (startId: string, edgeList: Edge[]): string[] => {
      const visited = new Set<string>();
      const path: string[] = [];
      let current = startId;
      while (current && !visited.has(current)) {
        visited.add(current);
        path.push(current);
        const next = edgeList.find(e => e.source === current);
        current = next?.target ?? '';
      }
      return path;
    };

    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return;
    const path = buildPath(triggerNode.id, edges);
    if (path.length === 0) return;

    setSimPath(path);
    setSimStep(-1);
    setChatMessages([]);
    setIsSimulating(true);
    setIsWaitingForInput(true); // Wait for user to trigger
  }, [isSimulating, stopSimulation, nodes, edges]);

  const handleChatInput = useCallback((text: string) => {
    if (!text.trim()) return;

    const currentPath = simPathRef.current;
    const currentNodes = nodesRef.current;
    const currentStep = simStepRef.current;

    const msgId = `user-${Date.now()}`;
    setChatMessages(prev => {
      if (prev.some(m => m.id === msgId)) return prev;
      return [...prev, { id: msgId, sender: 'user', text }];
    });

    if (currentStep === -1) {
      // Flow hasn't started — check trigger keyword
      const triggerNode = currentNodes.find(n => n.id === currentPath[0]);
      if (!triggerNode) return;

      const keywords = (triggerNode.data?.label as string || '')
        .toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
      const isMatch = keywords.length === 0 || keywords.some(k => text.toLowerCase().includes(k));

      if (isMatch) {
        setIsWaitingForInput(false);
        setSimStep(0);       // highlight trigger node
        simStepRef.current = 0;
        simTimerRef.current = setTimeout(() => {
          processNextNode(1, currentPath);
        }, 800);
      } else {
        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `Palabra clave no reconocida. Prueba con: ${triggerNode.data?.label as string || 'hola'}`
          }]);
        }, 500);
      }
    } else {
      // Responding to capture / button — resume flow
      setIsWaitingForInput(false);
      simTimerRef.current = setTimeout(() => {
        processNextNode(currentStep + 1, currentPath);
      }, 600);
    }
  }, [processNextNode]);

  // ── Shared Canvas JSX ────────────────────────────────────────────────
  const canvas = (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes.map(n => {
          const health = computeNodeHealth(nodes, edges);
          const hStatus = health[n.id] || 'neutral';
          const simActive = isSimulating && simPath[simStep] === n.id;
          
          return {
            ...n,
            className: (simActive && hStatus === 'error') 
              ? 'rounded-xl ring-4 ring-red-500 shadow-xl shadow-red-500/40 !border-red-500 transition-all duration-300' 
              : '',
            data: {
              ...n.data,
              healthStatus: hStatus,
              simActive,
              simDone: isSimulating && simPath.slice(0, simStep).includes(n.id),
            }
          };
        })}
        edges={edges.map(e => {
          const srcIdx = simPath.indexOf(e.source);
          const tgtIdx = simPath.indexOf(e.target);
          const isActive = isSimulating && srcIdx === simStep - 1 && tgtIdx === simStep;
          const isDone = isSimulating && tgtIdx < simStep;
          return {
            ...e,
            type: 'straight',
            animated: isActive || (!isSimulating && e.animated),
            style: isActive
              ? { stroke: '#10b981', strokeWidth: 3, filter: 'drop-shadow(0 0 6px #10b981)' }
              : isDone
              ? { stroke: '#6ee7b7', strokeWidth: 2 }
              : { stroke: '#10b981', strokeWidth: 2 },
          };
        })}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onSelectionChange={(params) => {
          const id = params.nodes[0]?.id || null;
          setSelectedNodeId(id);
        }}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        fitViewOptions={{ padding: 0.25, duration: 400 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        minZoom={0.1}
        maxZoom={2}
        colorMode="light"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#cbd5e1" />
        <Controls className="bg-white border-slate-200 fill-slate-500 shadow-sm" />
        {/* Contextual Quick-Connect menu — all node types */}
        {selectedNodeId && (
          <XYNodeToolbar nodeId={selectedNodeId} position={Position.Right} isVisible={true} className="ml-3">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-2xl p-2.5 animate-in slide-in-from-left-4 duration-200 w-[192px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block text-center mb-2">Conectar Nodo</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { type: 'message',       icon: <MessageSquare  className="w-4 h-4"/>, label: 'Mensaje',   color: 'text-blue-500',    bg: 'bg-blue-50   hover:bg-blue-100' },
                  { type: 'buttonMessage', icon: <LayoutList     className="w-4 h-4"/>, label: 'Botones',   color: 'text-blue-600',    bg: 'bg-blue-50   hover:bg-blue-100' },
                  { type: 'option',        icon: <ListPlus       className="w-4 h-4"/>, label: 'Menú',      color: 'text-amber-500',   bg: 'bg-amber-50  hover:bg-amber-100' },
                  { type: 'condition',     icon: <GitBranch      className="w-4 h-4"/>, label: 'Condición', color: 'text-emerald-500', bg: 'bg-emerald-50 hover:bg-emerald-100' },
                  { type: 'capture',       icon: <Database       className="w-4 h-4"/>, label: 'Capturar',  color: 'text-pink-500',    bg: 'bg-pink-50   hover:bg-pink-100' },
                  { type: 'media',         icon: <Image          className="w-4 h-4"/>, label: 'Media',     color: 'text-cyan-500',    bg: 'bg-cyan-50   hover:bg-cyan-100' },
                  { type: 'wait',          icon: <Clock          className="w-4 h-4"/>, label: 'Pausa',     color: 'text-slate-500',   bg: 'bg-slate-50  hover:bg-slate-100' },
                  { type: 'timeRouting',   icon: <CalendarClock  className="w-4 h-4"/>, label: 'Horario',   color: 'text-orange-500',  bg: 'bg-orange-50 hover:bg-orange-100' },
                  { type: 'apiCall',       icon: <LayoutTemplate className="w-4 h-4"/>, label: 'API',       color: 'text-fuchsia-500', bg: 'bg-fuchsia-50 hover:bg-fuchsia-100' },
                  { type: 'tag',           icon: <Tag            className="w-4 h-4"/>, label: 'Etiqueta',  color: 'text-purple-500',  bg: 'bg-purple-50 hover:bg-purple-100' },
                  { type: 'assign',        icon: <UserPlus       className="w-4 h-4"/>, label: 'Agente',    color: 'text-indigo-500',  bg: 'bg-indigo-50 hover:bg-indigo-100' },
                  { type: 'botHandoff',    icon: <UserPlus       className="w-4 h-4"/>, label: 'Humano',    color: 'text-orange-600',  bg: 'bg-orange-50 hover:bg-orange-100' },
                  { type: 'closeTicket',   icon: <UserCheck      className="w-4 h-4"/>, label: 'Resolver',  color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100' },
                ].map(({ type, icon, label, color, bg }) => (
                  <button
                    key={type}
                    title={label}
                    onClick={() => addNodeConnected(type, selectedNodeId)}
                    className={`group flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:-translate-y-0.5 ${bg}`}
                  >
                    <span className={color}>{icon}</span>
                    <span className="text-[8px] font-semibold text-slate-400 group-hover:text-slate-600 leading-none">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </XYNodeToolbar>
        )}



        {/* Expand/Play buttons — visible in both modes */}
        <Panel position="top-right" className="flex gap-2">
            <button
              onClick={runSimulation}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm border ${
                isSimulating
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 animate-pulse'
                  : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              {isSimulating ? 'Detener' : 'Simular Flujo'}
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-3 py-2 rounded-lg transition-all hover:shadow-md"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Expandir Canvas
            </button>
          </Panel>
      </ReactFlow>

      {/* Node Config Panel — single instance, always the same */}
      {selectedNode && (
        <NodeConfigPanel
          selectedNode={selectedNode}
          onClose={closePanel}
          onUpdateNode={updateNodeData}
          onDeleteNode={deleteNode}
        />
      )}

      {/* Traveling simulation bubble */}
      {isSimulating && simStep >= 0 && (
        <FlowBubble nodes={nodes} simPath={simPath} simStep={simStep} />
      )}

      {/* Draggable Phone preview */}
      <DraggablePhone 
        isSimulating={isSimulating} 
        nodes={nodes} 
        chatMessages={chatMessages}
        handleChatInput={handleChatInput}
        isWaitingForInput={isWaitingForInput}
      />
    </div>
  );

  // ══════════════════════════════════════════════════════════ FULLSCREEN
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-[#f4f7f9] font-sans">
        {/* Fullscreen Top Bar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-5 shrink-0 shadow-sm">
          {/* Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow">
              <PlayCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-slate-800 font-bold text-sm leading-none">{botConfig?.name || 'Editor de Flujo'}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Vista Expandida · Zoom 60%</p>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-200 mx-1 shrink-0 hidden" />

          {/* Node toolbar was moved to floating panel */}

          <div className="w-px h-8 bg-slate-200 mx-1 shrink-0 hidden" />

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => zoomOut()} title="Alejar" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={() => zoomIn()} title="Acercar" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onLayout}
              title="Auto Ordenar (Árbol)"
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border-r border-slate-200 pr-3"
            >
              <LayoutTemplate className="w-4 h-4" />
            </button>
            <button
              onClick={() => fitView({ padding: 0.3, duration: 400, maxZoom: 0.6 })}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              60%
            </button>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={`font-semibold px-5 h-9 shadow-sm transition-all ${
                isSaving ? 'bg-blue-400 text-white' :
                isDirty  ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isSaving ? <><Save className="w-3.5 h-3.5 mr-1.5 animate-spin" />Guardando...</> :
               isDirty  ? <><Save className="w-3.5 h-3.5 mr-1.5" />Guardar</>          :
               <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Guardado</>}
            </Button>

            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Minimizar
            </button>
          </div>
        </div>

        {/* Canvas */}
        {canvas}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════ NORMAL MODE
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-[#f4f7f9] overflow-hidden -mx-8 -mb-8 font-sans">
      {/* Normal Header */}
      <div className="min-h-[4rem] py-3 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="text-slate-500 hover:text-slate-800 hover:bg-slate-100">
            <Link href="/crm/chatbots"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-slate-800 font-bold tracking-wide flex items-center gap-2 text-lg">
              <PlayCircle className="w-5 h-5 text-emerald-500" />
              {botConfig?.name || 'Cargando Flujo...'}
            </h1>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">NPS BOT / Editor</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 flex-1 min-w-0">
          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {isSaving && <span className="text-blue-500 flex items-center gap-1"><Save className="w-3 h-3 animate-spin" />Guardando...</span>}
            {!isSaving && isDirty && <span className="text-orange-500 flex items-center gap-1">● Sin guardar</span>}
            {!isSaving && !isDirty && lastSaved && (
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Guardado {lastSaved.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className="text-slate-300 text-[10px] ml-1 hidden sm:block">Ctrl+S</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={runSimulation} 
              className={`text-sm font-medium px-4 h-9 ${
                isSimulating
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 animate-pulse hover:bg-emerald-600 hover:text-white'
                  : 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700'
              }`}
            >
              <PlayCircle className="w-4 h-4 mr-1.5" />
              {isSimulating ? 'Detener' : 'Simular Flujo'}
            </Button>
            <Button variant="outline" onClick={onLayout} className="text-slate-600 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700 text-sm font-medium px-4 h-9">
              <LayoutTemplate className="w-4 h-4 mr-1.5" />
              Ordenar
            </Button>
            <Button variant="ghost" onClick={handleDelete} disabled={isSaving} className="text-red-500 hover:text-red-600 hover:bg-red-50 text-sm font-medium px-4 h-9">
              <Trash2 className="w-4 h-4 mr-1.5" />
              Eliminar
            </Button>
            <Button variant="ghost" onClick={() => router.push('/crm/chatbots')} className="text-slate-500 hover:text-slate-800 text-sm font-medium px-4 h-9">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={`font-medium px-6 rounded-lg h-9 shadow-sm transition-all ${
                isSaving ? 'bg-blue-400 text-white' :
                isDirty  ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isSaving ? <><Save className="w-3.5 h-3.5 mr-1.5 animate-spin" />Guardando...</> :
               isDirty  ? <><Save className="w-3.5 h-3.5 mr-1.5" />Guardar</>          :
               <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Guardado</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0, minWidth: 0 }}>
        <div style={{ width: '100%', height: '100%' }}>
          {canvas}
        </div>
      </div>
    </div>
  );
}

// ── Outer wrapper: provides ReactFlow context ─────────────────────────────
export default function FlowCanvas({ chatbotId }: { chatbotId: string }) {
  return (
    <ReactFlowProvider>
      <FlowInner chatbotId={chatbotId} />
    </ReactFlowProvider>
  );
}
