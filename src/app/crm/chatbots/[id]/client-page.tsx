"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  BackgroundVariant,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Save, PlayCircle, Smartphone, MessageSquare, Zap, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatbotConfig } from '@/lib/types';
import { TriggerNode, MessageNode, OptionNode } from './custom-nodes';

// Map custom node types
const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  option: OptionNode
};

// Initial Mock Nodes for demonstration
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    data: { label: 'Palabra: hola' },
    position: { x: 50, y: 150 },
  },
  {
    id: '2',
    type: 'message',
    data: { label: '¡Hola! Bienvenido a élapiel. ¿En qué puedo ayudarte hoy?' },
    position: { x: 400, y: 150 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
];

export default function FlowCanvas({ chatbotId }: { chatbotId: string }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [botConfig, setBotConfig] = useState<ChatbotConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadBot() {
      const docRef = doc(db, 'crm_chatbots', chatbotId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as ChatbotConfig;
        setBotConfig(data);
        if (data.nodes && data.nodes.length > 0) setNodes(data.nodes);
        if (data.edges && data.edges.length > 0) setEdges(data.edges);
      }
    }
    loadBot();
  }, [chatbotId]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, eds)),
    []
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'crm_chatbots', chatbotId);
      await updateDoc(docRef, {
        nodes,
        edges
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const addNode = (type: 'trigger' | 'message' | 'option') => {
    const newNode: Node = {
      id: `${type}-${nodes.length + 1}`,
      type,
      position: { x: 250, y: 250 + (nodes.length * 20) }, // Offset for new nodes
      data: { 
        label: type === 'message' ? 'Nuevo Mensaje' : type === 'trigger' ? 'Nuevo Gatillo' : undefined,
        options: type === 'option' ? ['Sí', 'No'] : undefined
      }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#0f172a] overflow-hidden -m-8">
      
      {/* Constructor Header */}
      <div className="h-16 bg-[#1e293b]/80 border-b border-slate-700/50 flex items-center justify-between px-6 shrink-0 backdrop-blur-md z-50">
         <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="text-slate-400 hover:text-white">
               <Link href="/crm/chatbots"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
               <h1 className="text-white font-black italic tracking-widest uppercase flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-[#25D366]" />
                  {botConfig?.name || 'Cargando Flujo...'}
               </h1>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Flow Builder Workspace
               </p>
            </div>
         </div>

         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50">
               <Button variant="ghost" size="sm" onClick={() => addNode('trigger')} className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 text-xs font-semibold px-3 hidden md:flex">
                  <Zap className="w-4 h-4 mr-1.5" /> Gatillo
               </Button>
               <Button variant="ghost" size="sm" onClick={() => addNode('message')} className="text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 text-xs font-semibold px-3">
                  <MessageSquare className="w-4 h-4 mr-1.5" /> Mensaje
               </Button>
               <Button variant="ghost" size="sm" onClick={() => addNode('option')} className="text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 text-xs font-semibold px-3">
                  <ListPlus className="w-4 h-4 mr-1.5" /> Opciones
               </Button>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#25D366] hover:bg-[#1da851] text-white font-black shadow-lg shadow-[#25D366]/20 px-6 rounded-xl h-9">
               <Save className="w-4 h-4 mr-2" /> {isSaving ? "Guardando..." : "Guardar Flujo"}
            </Button>
         </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
         {/* Flow Canvas */}
         <div className="flex-1 relative w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              colorMode="dark"
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#334155" />
              <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
            </ReactFlow>
         </div>

         {/* Simulador Móvil (Mock) Sidebar right */}
         <aside className="w-80 bg-[#1e293b] border-l border-slate-700/50 flex flex-col hidden xl:flex shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 pointer-events-none absolute right-0 top-0 bottom-0">
            <div className="p-6 border-b border-slate-700/50 flex items-center gap-3">
               <Smartphone className="w-5 h-5 text-slate-400" />
               <h3 className="text-white font-black uppercase text-sm tracking-widest">Previsualización</h3>
            </div>
            <div className="flex-1 bg-black/40 p-4 overflow-y-auto w-full flex flex-col items-center justify-center">
                {/* Mock phone outline */}
                <div className="w-[280px] bg-[#0b141a] rounded-[2.5rem] border-[8px] border-slate-800 h-[580px] flex flex-col overflow-hidden relative shadow-2xl shrink-0">
                   {/* Phone Notch */}
                   <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-xl max-w-[120px] mx-auto z-20" />
                   
                   {/* WA Header */}
                   <div className="bg-[#202c33] h-16 flex items-center px-4 gap-3 shrink-0 pt-4 relative z-10">
                      <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
                         <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Bot" alt="Bot" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-white font-semibold text-[13px]">Elapiel Bot</span>
                         <span className="text-slate-400 text-[10px]">en línea</span>
                      </div>
                   </div>
                   
                   {/* Chat space */}
                   <div className="flex-1 bg-[#0b141a] p-3 space-y-3 relative overflow-y-auto scrollbar-hide z-0" style={{ backgroundImage: 'radial-gradient(#1f2937 1px, transparent 0)', backgroundSize: '16px 16px' }}>
                      <div className="flex justify-center mb-4">
                         <span className="bg-[#1f2c34] text-slate-400 text-[10px] px-3 py-1 rounded-lg">hoy</span>
                      </div>
                      <div className="bg-[#005c4b] text-[#e9edef] text-[13px] px-2.5 py-2 rounded-xl rounded-tr-none self-end ml-auto w-fit max-w-[85%] shadow-sm relative">
                         hola
                         <div className="text-[9px] text-[#8696a0] text-right mt-0.5 ml-2">10:00 AM</div>
                      </div>
                      <div className="bg-[#202c33] text-[#e9edef] text-[13px] px-2.5 py-2 rounded-xl rounded-tl-none self-start w-fit max-w-[85%] shadow-sm relative">
                         ¡Hola! Bienvenido a élapiel. ¿En qué puedo ayudarte hoy?
                         <div className="text-[9px] text-[#8696a0] text-right mt-0.5 ml-2">10:00 AM</div>
                      </div>
                   </div>
                   
                   {/* WA Input */}
                   <div className="bg-[#202c33] px-2 py-3 flex items-center shrink-0 z-10">
                      <div className="flex-1 bg-[#2a3942] rounded-full h-10 px-4 flex items-center text-[#8696a0] text-[13px]">
                         Mensaje
                      </div>
                   </div>
                </div>
            </div>
         </aside>
      </div>
    </div>
  );
}
