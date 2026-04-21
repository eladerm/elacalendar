"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ReactFlow, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, Node, Edge, NodeChange, EdgeChange, Connection, BackgroundVariant, Panel, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, PlayCircle, MessageSquare, Zap, Clock, GitBranch, LayoutList, Tag, UserPlus, Database, Image, CalendarClock, Maximize2, Minimize2, ZoomIn, ZoomOut, Trash2, LayoutTemplate, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import dagre from 'dagre';
import { db } from '@/lib/firebase';
import type { ChatbotConfig } from '@/lib/types'
import { TriggerNode, MessageNode, OptionNode, ButtonMessageNode, WaitNode, ConditionNode, TagNode, AssignNode, CaptureNode, MediaNode, TimeRoutingNode, ApiCallNode, CloseTicketNode, BotHandoffNode } from './custom-nodes';
import { NodeConfigPanel } from './NodeConfigPanel';

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
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
];

// ── Toolbar ─────────────────────────────────────────────────────────────
function NodeToolbar({ onAdd }: { onAdd: (type: string) => void }) {
  const items = [
    { type: 'message', icon: <MessageSquare className="w-4 h-4"/>, label: 'Mensaje Texto', color: 'text-blue-500', bg: 'bg-blue-50' },
    { type: 'buttonMessage', icon: <LayoutList className="w-4 h-4"/>, label: 'Mensaje Botones', color: 'text-blue-600', bg: 'bg-blue-50' },
    { type: 'option', icon: <ListPlus className="w-4 h-4"/>, label: 'Menú Múltiple', color: 'text-amber-500', bg: 'bg-amber-50' },
    { type: 'capture', icon: <Database className="w-4 h-4"/>, label: 'Capturar Dato', color: 'text-pink-500', bg: 'bg-pink-50' },
    { type: 'media', icon: <Image className="w-4 h-4"/>, label: 'Enviar Media', color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { type: 'wait', icon: <Clock className="w-4 h-4"/>, label: 'Pausar Flujo', color: 'text-slate-500', bg: 'bg-slate-50' },
    { type: 'condition', icon: <GitBranch className="w-4 h-4"/>, label: 'Regla / Condición', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { type: 'timeRouting', icon: <CalendarClock className="w-4 h-4"/>, label: 'Horario Laboral', color: 'text-orange-500', bg: 'bg-orange-50' },
    { type: 'apiCall', icon: <LayoutTemplate className="w-4 h-4"/>, label: 'API Externa', color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
    { type: 'tag', icon: <Tag className="w-4 h-4"/>, label: 'Añadir Etiqueta', color: 'text-purple-500', bg: 'bg-purple-50' },
    { type: 'assign', icon: <UserPlus className="w-4 h-4"/>, label: 'Asignar Agente', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { type: 'botHandoff', icon: <UserPlus className="w-4 h-4"/>, label: 'Pasar a Humano', color: 'text-orange-600', bg: 'bg-orange-50' },
    { type: 'closeTicket', icon: <Trash2 className="w-4 h-4"/>, label: 'Resolver Chat', color: 'text-red-500', bg: 'bg-red-50' },
  ];

  return (
    <>
      {items.map(({ type, icon, label, color, bg }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          title={`Agregar: ${label}`}
          className={`flex items-center gap-1.5 text-slate-600 hover:text-slate-900 ${bg} text-xs font-semibold px-3 h-8 rounded-lg transition-all`}
        >
          <span className={color}>{icon}</span>
          {label}
        </button>
      ))}
    </>
  );
}

// ── Inner component that uses useReactFlow (must be inside Provider) ────
function FlowInner({ chatbotId }: { chatbotId: string }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [botConfig, setBotConfig] = useState<ChatbotConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const router = useRouter();

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
          if (parsedNodes.length) setNodes(parsedNodes);
          if (parsedEdges.length) setEdges(parsedEdges);
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
    (params: Connection) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, eds)),
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
      // Brief visual feedback
    } catch (e) {
      console.error('Error guardando:', e);
      alert('Error al guardar el flujo. Verifica tu conexión.');
    } finally {
      setIsSaving(false);
    }
  }, [chatbotId, nodes, edges, isSaving]);

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

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: newData } : n));
  }, []);

  const closePanel = useCallback(() => {
    setSelectedNodeId(null);
    setNodes(nds => nds.map(n => ({ ...n, selected: false })));
  }, []);

  // ── Shared Canvas JSX ────────────────────────────────────────────────
  const canvas = (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
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

        {/* Expand button — only in normal mode */}
        {!isFullscreen && (
          <Panel position="top-right">
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-3 py-2 rounded-lg transition-all hover:shadow-md"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Expandir Canvas
            </button>
          </Panel>
        )}
      </ReactFlow>

      {/* Node Config Panel — single instance, always the same */}
      {selectedNode && (
        <NodeConfigPanel
          selectedNode={selectedNode}
          onClose={closePanel}
          onUpdateNode={updateNodeData}
        />
      )}

      {/* Phone preview — only in normal mode */}
      {!isFullscreen && (
        <div className="hidden xl:flex absolute right-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="w-[280px] bg-white rounded-[2.5rem] border-[8px] border-slate-200 shadow-2xl h-[580px] flex flex-col overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-200 rounded-b-xl max-w-[120px] mx-auto z-20" />
            <div className="bg-[#00a884] h-16 flex items-center px-4 gap-3 shrink-0 pt-4 z-10">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow overflow-hidden p-1">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Bot" alt="Bot" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-white font-semibold text-[13px] block">Elapiel Bot</span>
                <span className="text-white/80 text-[10px]">en línea</span>
              </div>
            </div>
            <div className="flex-1 bg-[#efeae2] p-3 space-y-3 z-0" style={{ backgroundImage: 'radial-gradient(#d1c7bc 1px, transparent 0)', backgroundSize: '16px 16px' }}>
              <div className="flex justify-center"><span className="bg-white text-slate-500 text-[10px] px-3 py-1 rounded-lg shadow-sm">hoy</span></div>
              <div className="bg-[#d9fdd3] text-slate-800 text-[13px] px-2.5 py-2 rounded-xl rounded-tr-none ml-auto w-fit max-w-[85%] shadow-sm">hola<div className="text-[9px] text-slate-500 text-right mt-0.5">10:00 AM</div></div>
              <div className="bg-white text-slate-800 text-[13px] px-2.5 py-2 rounded-xl rounded-tl-none w-fit max-w-[85%] shadow-sm">¡Hola! Bienvenido a élapiel.<div className="text-[9px] text-slate-400 text-right mt-0.5">10:00 AM</div></div>
            </div>
            <div className="bg-[#f0f2f5] px-2 py-3 flex items-center z-10">
              <div className="flex-1 bg-white rounded-full h-10 px-4 flex items-center text-slate-400 text-[13px] shadow-sm">Mensaje</div>
            </div>
          </div>
        </div>
      )}
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

          <div className="w-px h-8 bg-slate-200 mx-1 shrink-0" />

          {/* Node toolbar */}
          <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 gap-0.5 overflow-x-auto">
            <NodeToolbar onAdd={addNode} />
          </div>

          <div className="w-px h-8 bg-slate-200 mx-1 shrink-0" />

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
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 h-9 shadow-sm"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
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
    <div className="flex h-screen w-full flex-col bg-[#f4f7f9] overflow-hidden -m-8 font-sans">
      {/* Normal Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm">
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

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200 gap-0.5 flex-wrap">
            <NodeToolbar onAdd={addNode} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onLayout} className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 text-sm font-medium px-4 h-9">
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
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 rounded-lg h-9 shadow-sm">
              {isSaving ? 'Guardando...' : 'Guardar'}
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
