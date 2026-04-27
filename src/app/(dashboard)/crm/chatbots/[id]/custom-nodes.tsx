import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap, MessageSquare, ListPlus, GripVertical, Plus, X, Clock, GitBranch, LayoutList, CheckCircle2, Copy, Tag, UserPlus, Database, Image, CalendarClock, Webhook, XCircle, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Health indicator dot ──────────────────────────────────────────────────
function HealthDot({ status }: { status?: string }) {
  if (!status || status === 'neutral') return null;
  const cfg = {
    ok:      { bg: 'bg-emerald-400', glow: 'shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]',  title: 'Flujo correcto' },
    warning: { bg: 'bg-amber-400',   glow: 'shadow-[0_0_6px_2px_rgba(251,191,36,0.5)]',  title: 'Decisión sin salida o camino incompleto' },
    error:   { bg: 'bg-red-500',     glow: 'shadow-[0_0_6px_2px_rgba(239,68,68,0.6)]',   title: 'Nodo huérfano o sin conexiones' },
  }[status] || null;
  if (!cfg) return null;
  return (
    <div
      className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-white z-10 ${cfg.bg} ${cfg.glow}`}
      title={cfg.title}
    />
  );
}

// Función para actualizar globalmente desde dentro de un nodo
function useNodeDataUpdate(id: string) {
  const { setNodes } = useReactFlow();
  return (update: any) => {
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...update } };
        }
        return node;
      })
    );
  };
}

// =======================
// TriggerNode (Gatillo)
// =======================
export const TriggerNode = memo(({ data, selected }: any) => {
  const { simActive, simDone, healthStatus } = data || {};
  return (
    <div className={cn(
      "w-[260px] bg-white border rounded-xl overflow-hidden transition-all duration-500 relative",
      simActive ? "border-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.2),0_0_24px_8px_rgba(16,185,129,0.15)] scale-[1.02]" :
      simDone  ? "border-emerald-300 shadow-md opacity-80" :
      selected ? "border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500" :
                 "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <HealthDot status={healthStatus} />
      {simActive && (
        <span className="absolute inset-0 rounded-xl pointer-events-none animate-ping border-2 border-emerald-400 opacity-40" />
      )}
      <div className="bg-white p-2.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center text-emerald-500">
             <Zap className="w-4 h-4 fill-emerald-500" />
          </div>
          <div>
            <h3 className="text-emerald-600 font-semibold text-[13px]">Gatillo Inicial</h3>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab active:cursor-grabbing" />
      </div>
      <div className="p-3 bg-white flex flex-col gap-1.5 relative">
        <div className="text-[11px] text-slate-500 font-medium">Palabras clave:</div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-h-[40px] flex items-center shrink-0">
          <span className="text-[13px] text-slate-700 font-medium truncate">
            {data.label || 'Cualquier interacción...'}
          </span>
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-white border-[2px] border-emerald-500 shadow-sm"
      />
    </div>
  );
});
TriggerNode.displayName = 'TriggerNode';

// =======================
// MessageNode (Mensaje Bot)
// =======================
export const MessageNode = memo(({ data, selected }: any) => {
  const { simActive, simDone, healthStatus } = data || {};
  return (
    <div className={cn(
      "w-[300px] bg-white border rounded-xl overflow-hidden transition-all duration-500 relative",
      simActive ? "border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.2),0_0_24px_8px_rgba(59,130,246,0.12)] scale-[1.02]" :
      simDone  ? "border-blue-200 shadow-md opacity-80" :
      selected ? "border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500" :
                 "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <HealthDot status={healthStatus} />
      {simActive && (
        <span className="absolute inset-0 rounded-xl pointer-events-none animate-ping border-2 border-blue-400 opacity-40" />
      )}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50/50 p-2.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center text-blue-500">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className="text-slate-600 font-medium text-[13px]">Mensaje de Texto</h3>
        </div>
        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
      </div>
      <div className="p-3 bg-white">
        <div className="w-full min-h-[50px] max-h-[80px] overflow-hidden bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[13px] text-slate-600 leading-relaxed break-words">
           <span className={!data.label ? "text-slate-400 italic" : ""}>
               {data.label || 'Mensaje vacío...'}
           </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-[2px] border-blue-500" />
    </div>
  );
});
MessageNode.displayName = 'MessageNode';

// =======================
// ButtonMessageNode (Mensaje + Botones)
// =======================
export const ButtonMessageNode = memo(({ data, selected }: any) => {
  const buttons: string[] = data.buttons || ['Opción 1', 'Opción 2'];

  return (
    <div className={cn(
      "w-[320px] bg-white border rounded-xl shadow-sm overflow-hidden transition-all",
      selected ? "ring-2 ring-blue-500/20 border-blue-500 shadow-md" : "border-slate-200 hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />

      <div className="p-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center text-blue-500">
             <LayoutList className="w-4 h-4" />
          </div>
          <h3 className="text-slate-700 font-semibold text-[13px]">Mensaje con Botones</h3>
        </div>
        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
      </div>

      <div className="p-3 bg-white">
         <div className="w-full min-h-[50px] max-h-[80px] overflow-hidden bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[13px] text-slate-600 leading-relaxed break-words">
            <span className={!data.label ? "text-slate-400 italic" : ""}>
               {data.label || 'Sin mensaje principal...'}
            </span>
         </div>
      </div>

      <div className="px-3 pb-3 flex flex-col gap-2">
        <div className="flex flex-col gap-2">
            {buttons.map((btn: string, i: number) => (
            <div key={i} className="relative flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2">
                <span className="w-full text-[12px] text-slate-700 font-medium truncate">
                   {btn || `Opción ${i + 1}`}
                </span>
                <Handle
                   type="source"
                   position={Position.Bottom}
                   id={`btn-${i}`}
                   style={{ top: '50%', right: '-6px', position: 'absolute' }}
                   className="w-3 h-3 bg-white border-[2px] border-blue-400"
                />
            </div>
            ))}
        </div>
      </div>
    </div>
  );
});
ButtonMessageNode.displayName = 'ButtonMessageNode';


// =======================
// OptionNode (Botones legacy)
// =======================
export const OptionNode = memo(({ data, selected }: any) => {
  const options = data.options || ['Sí', 'No'];

  return (
    <div className={cn(
      "w-[260px] bg-white border rounded-xl overflow-hidden transition-all",
      selected ? "border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50/50 p-2 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-600">
          <ListPlus className="w-4 h-4 ml-1" />
          <h3 className="font-medium text-[12px]">Menú Múltiple</h3>
        </div>
        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
      </div>
      <div className="p-3 flex flex-col gap-2">
         {options.map((opt: string, i: number) => (
            <div key={i} className="relative bg-slate-50 border border-slate-200 rounded-md p-2 flex items-center justify-center">
               <span className="text-[13px] text-slate-700 font-medium truncate text-center">
                  {opt || `Opción ${i + 1}`}
               </span>
               <Handle 
                  type="source" 
                  position={Position.Bottom} 
                  id={`opt-${i}`}
                  style={{ top: '50%', right: '-4px' }}
                  className="w-2.5 h-2.5 bg-white border-[2px] border-amber-400"
               />
            </div>
         ))}
      </div>
    </div>
  );
});
OptionNode.displayName = 'OptionNode';

// =======================
// WaitNode (Pausa)
// =======================
export const WaitNode = memo(({ data, selected }: any) => {
  return (
    <div className={cn(
      "w-[260px] bg-white border rounded-xl overflow-hidden transition-all",
      selected ? "border-slate-400 shadow-md ring-1 ring-slate-400" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50 p-2.5 flex items-center border-b border-slate-100 gap-2">
        <Clock className="w-4 h-4 text-slate-500" />
        <h3 className="text-slate-700 font-medium text-[13px]">Pausa</h3>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2 px-3">
            <span className="text-[12px] text-slate-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Esperar:</span>
            <span className="text-[13px] text-slate-700 font-semibold">
               {data.seconds || 24} {data.unit || 'horas'}
            </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-[2px] border-slate-400" />
    </div>
  );
});
WaitNode.displayName = 'WaitNode';

// =======================
// ConditionNode (Condición Filtro)
// =======================
export const ConditionNode = memo(({ data, selected }: any) => {
  return (
    <div className={cn(
      "w-[340px] bg-white border rounded-xl overflow-hidden transition-all",
       selected ? "border-slate-400 shadow-md ring-1 ring-slate-400" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50 p-2.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
            <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-500 font-bold">?</span>
            <span className="text-slate-600 font-medium text-[13px]">Condición</span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2 relative">
         <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2 bg-white relative">
             <div className="text-[12px] text-slate-600 font-medium flex items-center justify-between">
                <span><CheckCircle2 className="w-3 h-3 text-emerald-500 inline mr-1" /> Si contiene:</span>
             </div>
             <div className="bg-slate-50 border-b border-slate-200 p-1 rounded px-2">
                 <span className="text-slate-700 text-[13px] italic">
                    {data.condition || '(Sin condición principal)'}
                 </span>
             </div>
             <Handle type="source" id="yes" position={Position.Bottom} style={{ top: '50%', right: '-12px' }} className="w-3 h-3 bg-white border-[2px] border-emerald-500" />
         </div>
         
         <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2 bg-white relative mt-1">
            <div className="text-[12px] text-slate-600 font-medium flex items-center">
                <span><X className="w-3 h-3 inline text-rose-500 mr-1"/> En caso contrario:</span>
            </div>
             <Handle type="source" id="no" position={Position.Bottom} style={{ top: '50%', right: '-12px' }} className="w-3 h-3 bg-white border-[2px] border-rose-400" />
         </div>
      </div>
    </div>
  );
});
ConditionNode.displayName = 'ConditionNode';

// =======================
// TagNode (Asignar Etiqueta)
// =======================
export const TagNode = memo(({ data, selected }: any) => {
  const tags: string[] = data.tags || [];
  return (
    <div className={cn(
      "w-[260px] bg-white border rounded-xl overflow-hidden transition-all",
       selected ? "border-purple-500 shadow-md ring-1 ring-purple-500" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50 p-2.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-500" />
            <span className="text-slate-600 font-medium text-[13px]">Añadir Etiqueta</span>
        </div>
      </div>
      <div className="p-3">
         <div className="flex flex-wrap gap-1.5">
            {tags.length > 0 ? tags.map((t, i) => (
               <span key={i} className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                  {t}
               </span>
            )) : <span className="text-slate-400 text-[12px] italic">Sin etiquetas seleccionadas...</span>}
         </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-[2px] border-purple-500" />
    </div>
  );
});
TagNode.displayName = 'TagNode';

// =======================
// AssignNode (Asignar Agente)
// =======================
export const AssignNode = memo(({ data, selected }: any) => {
  return (
    <div className={cn(
      "w-[260px] bg-white border rounded-xl overflow-hidden transition-all",
       selected ? "border-indigo-500 shadow-md ring-1 ring-indigo-500" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50 p-2.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-500" />
            <span className="text-slate-600 font-medium text-[13px]">Asignar Agente</span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1">
         <span className="text-[11px] text-slate-500 font-medium">Departamento:</span>
         <span className="text-[13px] text-slate-700 font-semibold truncate">{data.department || 'Sin asignar'}</span>
      </div>
    </div>
  );
});
AssignNode.displayName = 'AssignNode';

// =======================
// CaptureNode (Capturar Campo CRM)
// =======================
export const CaptureNode = memo(({ data, selected }: any) => {
  return (
    <div className={cn(
      "w-[300px] bg-white border rounded-xl overflow-hidden transition-all",
       selected ? "border-pink-500 shadow-md ring-1 ring-pink-500" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50 p-2.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-pink-500" />
            <span className="text-slate-600 font-medium text-[13px]">Forzar Input (Guardar)</span>
        </div>
      </div>
      <div className="p-3">
         <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[13px] text-slate-600 leading-relaxed mb-2">
            <span className={!data.question ? "text-slate-400 italic" : ""}>
               {data.question || 'Escribe la pregunta aquí...'}
            </span>
         </div>
         <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1"><Database className="w-3 h-3"/> Campo CRM:</span>
            <span className="text-[12px] font-mono text-pink-600 bg-pink-50 px-1.5 rounded">{data.crmField || 'Ninguno'}</span>
         </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-[2px] border-pink-500" />
    </div>
  );
});
CaptureNode.displayName = 'CaptureNode';

// =======================
// MediaNode (Enviar Archivo)
// =======================
export const MediaNode = memo(({ data, selected }: any) => {
  return (
    <div className={cn(
      "w-[240px] bg-white border rounded-xl overflow-hidden transition-all",
       selected ? "border-cyan-500 shadow-md ring-1 ring-cyan-500" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50 p-2.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-cyan-500" />
            <span className="text-slate-600 font-medium text-[13px]">Enviar Archivo</span>
        </div>
      </div>
      <div className="p-4 flex flex-col items-center justify-center gap-2 bg-slate-50/50">
          <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600">
             <Image className="w-5 h-5" />
          </div>
          <span className="text-[12px] font-medium text-slate-500 truncate max-w-full">
             {data.mediaUrl ? 'Archivo adjunto listo' : 'Ningún archivo adjunto'}
          </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-[2px] border-cyan-500" />
    </div>
  );
});
MediaNode.displayName = 'MediaNode';

// =======================
// TimeRoutingNode (Condición Horario)
// =======================
export const TimeRoutingNode = memo(({ data, selected }: any) => {
  return (
    <div className={cn(
      "w-[340px] bg-white border rounded-xl overflow-hidden transition-all",
       selected ? "border-orange-500 shadow-md ring-1 ring-orange-500" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50 p-2.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-orange-500" />
            <span className="text-slate-600 font-medium text-[13px]">Enrutamiento por Horario</span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2 relative">
         <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2 bg-white relative">
             <div className="text-[12px] text-slate-600 font-medium flex items-center justify-between">
                <span><CheckCircle2 className="w-3 h-3 text-emerald-500 inline mr-1" /> Dentro de Horario Requerido:</span>
             </div>
             <Handle type="source" id="in_hours" position={Position.Bottom} style={{ top: '50%', right: '-12px' }} className="w-3 h-3 bg-white border-[2px] border-emerald-500" />
         </div>
         
         <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2 bg-white relative mt-1">
            <div className="text-[12px] text-slate-600 font-medium flex items-center">
                <span><X className="w-3 h-3 inline text-rose-500 mr-1"/> Fuera de Horario Laboral:</span>
            </div>
             <Handle type="source" id="out_hours" position={Position.Bottom} style={{ top: '50%', right: '-12px' }} className="w-3 h-3 bg-white border-[2px] border-rose-400" />
         </div>
      </div>
    </div>
  );
});
TimeRoutingNode.displayName = 'TimeRoutingNode';

// =======================
// ApiCallNode (Endpoint Externo)
// =======================
export const ApiCallNode = memo(({ data, selected }: any) => {
  return (
    <div className={cn(
      "w-[300px] bg-white border rounded-xl overflow-hidden transition-all",
       selected ? "border-fuchsia-500 shadow-md ring-1 ring-fuchsia-500" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-slate-50 p-2.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-fuchsia-500" />
            <h3 className="text-slate-600 font-medium text-[13px]">Conectar API (Externa)</h3>
        </div>
      </div>
      <div className="p-3">
        <div className="flex flex-col gap-1.5">
           <span className="text-[11px] font-bold text-slate-500 uppercase">Endpoint URL:</span>
           <div className="w-full min-h-[30px] overflow-hidden bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] text-fuchsia-600 truncate break-all font-mono">
              <span className={!data.apiUrl ? "text-slate-400 italic" : ""}>
                 {data.apiUrl || 'https://tu-endpoint.com/api...'}
              </span>
           </div>
        </div>
        <div className="flex justify-between items-center mt-3">
           <span className="text-[10px] font-bold px-2 py-0.5 bg-fuchsia-50 text-fuchsia-600 rounded uppercase">POST</span>
           <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{(data.body || []).length} vars</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-[2px] border-fuchsia-500" />
    </div>
  );
});
ApiCallNode.displayName = 'ApiCallNode';

// =======================
// CloseTicketNode (Resolver Chat)
// =======================
export const CloseTicketNode = memo(({ data, selected }: any) => {
  return (
    <div className={cn(
      "w-[240px] bg-white border rounded-xl overflow-hidden transition-all",
       selected ? "border-red-500 shadow-md ring-1 ring-red-500" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-red-50 p-2.5 flex items-center justify-between border-b border-red-100">
        <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <h3 className="text-red-700 font-medium text-[13px]">Resolver Chat</h3>
        </div>
      </div>
      <div className="p-3">
          <p className="text-[11px] text-slate-500 leading-tight">Mueve automáticamente la conversación al estado de <strong className="text-red-500">Cerrado</strong> y detiene el flujo actual.</p>
      </div>
    </div>
  );
});
CloseTicketNode.displayName = 'CloseTicketNode';

// =======================
// BotHandoffNode (Salir del Chatbot / Humano)
// =======================
export const BotHandoffNode = memo(({ data, selected }: any) => {
  return (
    <div className={cn(
      "w-[240px] bg-white border rounded-xl overflow-hidden transition-all",
       selected ? "border-orange-500 shadow-md ring-1 ring-orange-500" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-100 border-[2px] border-slate-300" />
      <div className="bg-orange-50 p-2.5 flex items-center justify-between border-b border-orange-100">
        <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-orange-500" />
            <h3 className="text-orange-700 font-medium text-[13px]">Pasar a Humano</h3>
        </div>
      </div>
      <div className="p-3">
          <p className="text-[11px] text-slate-500 leading-tight">Pausa el chatbot para esta conversación (<strong className="text-orange-500">Espera</strong>) permitiendo intervención humana.</p>
      </div>
    </div>
  );
});
BotHandoffNode.displayName = 'BotHandoffNode';

