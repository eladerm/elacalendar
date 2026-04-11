import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap, MessageSquare, ListPlus, GripVertical, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
export const TriggerNode = memo(({ id, data, selected }: any) => {
  const updateData = useNodeDataUpdate(id);

  return (
    <div className={cn(
      "w-[260px] bg-slate-900 border-2 rounded-2xl shadow-xl overflow-hidden transition-all",
      selected ? "border-[#25D366] shadow-[#25D366]/20" : "border-slate-800"
    )}>
      <div className="bg-[#111b21] p-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Zap className="w-5 h-5 fill-emerald-500/20" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Gatillo Inicial</h3>
            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Inicio del Flujo</p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-slate-600 cursor-grab active:cursor-grabbing" />
      </div>
      <div className="p-4 bg-slate-900 flex flex-col gap-2 relative">
        <div className="text-xs text-slate-400 font-medium">Condición:</div>
        <input 
          type="text"
          className="nodrag bg-slate-800 hover:bg-slate-800/80 focus:bg-slate-950 focus:ring-1 focus:ring-emerald-500 rounded-lg p-2 text-sm text-slate-200 border border-slate-700 outline-none w-full transition-all"
          placeholder="Ej: Palabra: hola"
          value={data.label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
        />
      </div>
      {/* Salida única para el Trigger */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-[#25D366] border-2 border-slate-900"
      />
    </div>
  );
});

// =======================
// MessageNode (Mensaje Bot)
// =======================
export const MessageNode = memo(({ id, data, selected }: any) => {
  const updateData = useNodeDataUpdate(id);

  return (
    <div className={cn(
      "w-[280px] bg-slate-900 border-2 rounded-2xl shadow-xl overflow-hidden transition-all",
      selected ? "border-blue-500 shadow-blue-500/20" : "border-slate-800"
    )}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-slate-400 border-2 border-slate-900"
      />
      <div className="bg-[#111b21] p-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Mensaje</h3>
            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Enviar Respuesta</p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-slate-600 cursor-grab" />
      </div>
      <div className="p-4 bg-slate-900">
        <div className="bg-[#202c33] rounded-t-xl rounded-br-xl rounded-bl-sm p-1.5 text-sm text-[#e9edef] border border-slate-700/50 shadow-inner relative overflow-hidden group">
           {/* WA Chat background pattern mockup */}
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 0)', backgroundSize: '10px 10px' }} />
           
           <textarea
             className="nodrag w-full min-h-[60px] bg-transparent resize-none border-none outline-none relative z-10 break-words placeholder:text-slate-500 p-2 focus:bg-black/10 rounded-lg transition-colors"
             placeholder="Escribe tu mensaje..."
             value={data.label || ''}
             onChange={(e) => updateData({ label: e.target.value })}
           />
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-blue-500 border-2 border-slate-900"
      />
    </div>
  );
});

// =======================
// OptionNode (Opciones/Botones)
// =======================
export const OptionNode = memo(({ id, data, selected }: any) => {
  const updateData = useNodeDataUpdate(id);
  const options = data.options || ['Opción 1', 'Opción 2'];
  
  const updateOption = (index: number, newVal: string) => {
    const newOptions = [...options];
    newOptions[index] = newVal;
    updateData({ options: newOptions });
  };

  const addOption = () => {
    updateData({ options: [...options, `Opción ${options.length + 1}`] });
  };

  const removeOption = (index: number) => {
    updateData({ options: options.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className={cn(
      "w-[260px] bg-slate-900 border-2 rounded-2xl shadow-xl overflow-hidden transition-all",
      selected ? "border-amber-500 shadow-amber-500/20" : "border-slate-800"
    )}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-slate-400 border-2 border-slate-900"
      />
      <div className="bg-[#111b21] p-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <ListPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Menú de Opciones</h3>
            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Botones Interactivos</p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-slate-600 cursor-grab" />
      </div>
      
      <div className="p-3 bg-slate-900 flex flex-col gap-2">
         {options.map((opt: string, i: number) => (
            <div key={i} className="relative bg-slate-800 rounded-lg p-1 group border border-slate-700 font-semibold focus-within:border-amber-500/50 transition-colors">
               <input
                 type="text"
                 className="nodrag w-full bg-transparent border-none text-center text-sm text-amber-400 outline-none p-1 placeholder:text-amber-400/30 font-semibold"
                 value={opt}
                 onChange={(e) => updateOption(i, e.target.value)}
                 placeholder="Opción..."
               />
               
               {/* Multiple source handles para cada opción! */}
               <Handle 
                  type="source" 
                  position={Position.Right} 
                  id={`opt-${i}`}
                  style={{ top: '50%', right: '-3px' }}
                  className="w-3 h-3 bg-amber-500 border-2 border-slate-900 !right-[-8px]"
               />

               {options.length > 1 && (
                  <button 
                    onClick={() => removeOption(i)}
                    className="absolute -left-2 -top-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
               )}
            </div>
         ))}
         
         <button 
            onClick={addOption}
            className="mt-2 w-full py-1.5 border border-dashed border-slate-700 hover:border-amber-500/50 rounded-lg text-slate-500 hover:text-amber-400 transition-colors flex items-center justify-center gap-1 text-[10px] uppercase font-black tracking-wider"
         >
            <Plus className="w-3 h-3" /> Añadir Opción
         </button>
      </div>
    </div>
  );
});
