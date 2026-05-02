import React, { useState, useEffect, useRef } from 'react';
import { Node } from '@xyflow/react';
import { Settings, X, Plus, Trash2, AlignLeft, ListPlus, GitBranch, Clock, Zap, Tag, UserPlus, Database, Image, CalendarClock, Maximize2, Minimize2, Webhook, XCircle, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Constante de variables
const USER_VARS = ['{{nombre}}', '{{telefono}}', '{{email}}', '{{fecha_actual}}'];

export function NodeConfigPanel({ 
    selectedNode, 
    onClose, 
    onUpdateNode,
    onDeleteNode
}: { 
    selectedNode: Node | null, 
    onClose: () => void,
    onUpdateNode: (nodeId: string, data: any) => void,
    onDeleteNode?: (nodeId: string) => void
}) {
  const [data, setData] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drag logic
  const [position, setPosition] = useState({ x: 20, y: 80 }); // Default left side
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Adjust default position based on window height if needed, 
    // but 20px from left and 80px from top is a safe default for "left"
  }, []);

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

  useEffect(() => {
     if (selectedNode) {
        setData(selectedNode.data);
     } else {
        setData(null);
     }
  }, [selectedNode]);

  // Close fullscreen with Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen, onClose]);

  if (!selectedNode || !data) return null;

  const handleChange = (key: string, value: any) => {
      const newData = { ...data, [key]: value };
      setData(newData);
      onUpdateNode(selectedNode.id, newData);
  };

  const updateArrayItem = (key: string, index: number, value: string) => {
      const arr = [...(data[key] || [])];
      arr[index] = value;
      handleChange(key, arr);
  };

  const addArrayItem = (key: string, defaultVal: any) => {
      const arr = [...(data[key] || []), defaultVal];
      handleChange(key, arr);
  };

  const removeArrayItem = (key: string, index: number) => {
      const arr = (data[key] || []).filter((_: any, i: number) => i !== index);
      handleChange(key, arr);
  };

  const renderContent = () => {
      switch (selectedNode.type) {
          case 'trigger':
              return (
                  <div className="space-y-4">
                      <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-4">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                  checked={data.startWithAi ?? true}
                                  onChange={(e) => handleChange('startWithAi', e.target.checked)}
                              />
                              <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700">Iniciar con Bot IA (Gia)</span>
                                  <span className="text-[10px] text-slate-500">Gia analizará y responderá antes de iniciar el flujo visual.</span>
                              </div>
                          </label>
                          
                          {(data.startWithAi ?? true) && (
                              <div className="pt-2 border-t border-emerald-100/50">
                                  <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-1.5">Calidad de Humanidad</label>
                                  <select 
                                      className="w-full bg-white border border-emerald-200 text-slate-700 text-sm rounded-lg p-2 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-medium"
                                      value={data.humanityLevel || 'alta'}
                                      onChange={(e) => handleChange('humanityLevel', e.target.value)}
                                  >
                                      <option value="alta">Alta (Muy empática, cálida y detallada)</option>
                                      <option value="media">Media (Equilibrada y profesional)</option>
                                      <option value="baja">Baja (Directa, robótica y concisa)</option>
                                  </select>
                              </div>
                          )}
                      </div>

                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Intención / Palabras Clave</label>
                          <textarea 
                             className={cn("w-full text-sm p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-y", isFullscreen ? "min-h-[140px]" : "min-h-[70px]")}
                             placeholder="Ej: precios, agendar, hola"
                             value={data.label || ''}
                             onChange={(e) => handleChange('label', e.target.value)}
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Escribe la intención o palabra clave para activar este flujo.</p>
                      </div>
                  </div>
              );
          case 'message':
              return (
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Texto del Mensaje</label>
                          <textarea 
                             className={cn("w-full text-sm p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-y", isFullscreen ? "min-h-[300px]" : "min-h-[90px]")}
                             placeholder="Escribe tu mensaje..."
                             value={data.label || ''}
                             onChange={(e) => handleChange('label', e.target.value)}
                          />
                          {isFullscreen && (
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              {USER_VARS.map(v => (
                                <button key={v} onClick={() => handleChange('label', (data.label || '') + v)} className="text-[11px] font-mono bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
                                  + {v}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                  </div>
              );
          case 'buttonMessage':
              const buttons = data.buttons || ['Opción 1', 'Opción 2'];
              return (
                  <div className={cn("space-y-5", isFullscreen && "grid grid-cols-2 gap-6 space-y-0")}>
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Mensaje Principal</label>
                          <textarea 
                             className={cn("w-full text-sm p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none", isFullscreen ? "min-h-[200px]" : "min-h-[80px]")}
                             placeholder="Pregunta o instrucción..."
                             value={data.label || ''}
                             onChange={(e) => handleChange('label', e.target.value)}
                          />
                          {isFullscreen && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {USER_VARS.map(v => (
                                <button key={v} onClick={() => handleChange('label', (data.label || '') + v)} className="text-[10px] font-mono bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded-md hover:bg-blue-100">
                                  + {v}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-2 flex justify-between">
                              Opciones (Botones)
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{buttons.length}/3 máx</span>
                          </label>
                          <div className="space-y-2">
                              {buttons.map((btn: string, i: number) => (
                                  <div key={i} className="flex items-center gap-2">
                                      <input 
                                          className="flex-1 text-sm p-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-400 outline-none transition-colors"
                                          value={btn}
                                          onChange={(e) => updateArrayItem('buttons', i, e.target.value)}
                                          placeholder={`Opción ${i + 1}`}
                                      />
                                      {buttons.length > 1 && (
                                          <button onClick={() => removeArrayItem('buttons', i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      )}
                                  </div>
                              ))}
                              {buttons.length < 3 && (
                                  <Button variant="outline" size="sm" onClick={() => addArrayItem('buttons', `Opción ${buttons.length + 1}`)} className="w-full mt-2 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100">
                                      <Plus className="w-4 h-4 mr-1.5" /> Añadir Opción
                                  </Button>
                              )}
                          </div>
                      </div>
                  </div>
              );
          case 'option':
              const optionsList = data.options || ['Sí', 'No'];
              return (
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-2 block">Opciones del Menú</label>
                          <div className={cn("space-y-2", isFullscreen && "grid grid-cols-2 gap-2 space-y-0")}>
                              {optionsList.map((opt: string, i: number) => (
                                  <div key={i} className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}.</span>
                                      <input 
                                          className="flex-1 text-sm p-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-amber-400 outline-none transition-colors"
                                          value={opt}
                                          onChange={(e) => updateArrayItem('options', i, e.target.value)}
                                          placeholder={`Opción ${i + 1}`}
                                      />
                                      {optionsList.length > 1 && (
                                          <button onClick={() => removeArrayItem('options', i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      )}
                                  </div>
                              ))}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => addArrayItem('options', `Opción ${optionsList.length + 1}`)} className="w-full mt-3 text-amber-600 border-amber-200 bg-amber-50/50 hover:bg-amber-100">
                              <Plus className="w-4 h-4 mr-1.5" /> Añadir Opción
                          </Button>
                      </div>
                  </div>
              );
          case 'wait':
               return (
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-2 block">Tiempo de Espera</label>
                          <div className="flex gap-2">
                              <input 
                                 type="number"
                                 className="w-24 text-sm p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-slate-400"
                                 value={data.seconds || 24}
                                 onChange={(e) => handleChange('seconds', Number(e.target.value))}
                              />
                              <select 
                                 className="flex-1 text-sm p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-slate-400"
                                 value={data.unit || 'horas'}
                                 onChange={(e) => handleChange('unit', e.target.value)}
                              >
                                  <option value="horas">Horas</option>
                                  <option value="min">Minutos</option>
                                  <option value="seg">Segundos</option>
                              </select>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500">¿Recordatorio de Inactividad?</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={data.enableTimeout || false} onChange={e => handleChange('enableTimeout', e.target.checked)} />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                          </div>
                          
                          {data.enableTimeout && (
                            <p className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2 rounded relative">Al activar, el flujo avanzará por una ruta 'Fallback' si el cliente no responde a tiempo.</p>
                          )}
                      </div>
                  </div>
               );
          case 'condition':
               return (
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Regla: Si contiene palabra</label>
                          <input 
                             type="text"
                             className="w-full text-sm p-2 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                             placeholder="Ej: costo, precio"
                             value={data.condition || ''}
                             onChange={(e) => handleChange('condition', e.target.value)}
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Si el mensaje del cliente contiene alguna de estas palabras, irá por el camino Verde.</p>
                      </div>
                  </div>
               );
          case 'tag':
              return (
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Etiquetas (separadas por coma)</label>
                          <input 
                             type="text"
                             className="w-full text-sm p-2 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                             placeholder="Ej: VIP, cliente, urgente"
                             value={(data.tags || []).join(', ')}
                             onChange={(e) => handleChange('tags', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Se asignarán automáticamente al contacto en el CRM.</p>
                          {isFullscreen && (data.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {(data.tags || []).map((t: string) => (
                                <span key={t} className="text-[11px] bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">#{t}</span>
                              ))}
                            </div>
                          )}
                      </div>
                  </div>
              );
          case 'assign':
              return (
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Departamento / Equipo</label>
                          <select 
                             className="w-full text-sm p-2 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                             value={data.department || ''}
                             onChange={(e) => handleChange('department', e.target.value)}
                          >
                              <option value="">Selecciona un equipo...</option>
                              <option value="Ventas">Ventas</option>
                              <option value="Soporte Técnico">Soporte Técnico</option>
                              <option value="Atención al Cliente">Atención al Cliente</option>
                              <option value="Administración">Administración</option>
                          </select>
                      </div>
                  </div>
              );
          case 'capture':
              return (
                  <div className={cn("space-y-5", isFullscreen && "grid grid-cols-2 gap-6 space-y-0")}>
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Pregunta al Cliente</label>
                          <textarea 
                             className={cn("w-full text-sm p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none resize-none", isFullscreen ? "min-h-[160px]" : "min-h-[80px]")}
                             placeholder="Ej: ¿Cuál es tu correo electrónico?"
                             value={data.question || ''}
                             onChange={(e) => handleChange('question', e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Campo en el CRM a Guardar</label>
                          <select 
                             className="w-full text-sm p-2 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                             value={data.crmField || ''}
                             onChange={(e) => handleChange('crmField', e.target.value)}
                          >
                              <option value="">Selecciona campo...</option>
                              <option value="contact.name">Nombre Completo</option>
                              <option value="contact.email">Correo Electrónico</option>
                              <option value="contact.phone">Teléfono (Numérico)</option>
                              <option value="custom.dni">DNI / Documento</option>
                          </select>
                      </div>
                  </div>
              );
          case 'media':
              return (
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">URL del Archivo Adjunto</label>
                          <input 
                             type="url"
                             className="w-full text-sm p-2 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                             placeholder="https://ejemplo.com/archivo.pdf"
                             value={data.mediaUrl || ''}
                             onChange={(e) => handleChange('mediaUrl', e.target.value)}
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Ingresa el enlace público de la imagen o documento.</p>
                          {isFullscreen && data.mediaUrl && (
                            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Vista Previa URL</p>
                              <a href={data.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-600 hover:underline break-all">{data.mediaUrl}</a>
                            </div>
                          )}
                      </div>
                  </div>
              );
          case 'timeRouting':
              return (
                  <div className="space-y-4">
                      <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-[13px] border border-orange-100 flex gap-2">
                         <CalendarClock className="w-5 h-5 shrink-0 text-orange-500" />
                         <span>Deriva al usuario según el Horario Laboral del CRM.</span>
                      </div>
                  </div>
              );
          case 'apiCall':
              const headers = data.headers || [];
              const bodyObj = data.body || [];
              return (
                 <div className={cn("space-y-5", isFullscreen && "grid grid-cols-2 gap-6 space-y-0")}>
                    <div>
                       <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Endpoint URL (POST)</label>
                       <input
                         type="url"
                         className="w-full text-sm p-2 px-3 bg-white border border-slate-200 rounded-lg focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-mono"
                         placeholder="https://us-central1-tu-app.cloudfunctions.net/api"
                         value={data.apiUrl || ''}
                         onChange={(e) => handleChange('apiUrl', e.target.value)}
                       />
                       <p className="text-[10px] text-slate-400 mt-1">Soporta variables: {'{{telefono}}'} etc.</p>
                    </div>
                    <div>
                       <label className="text-xs font-semibold text-slate-500 flex justify-between items-end border-b border-slate-100 pb-1 mb-2">
                          Body Variables (Dinámicas)
                          <button onClick={() => addArrayItem('body', { key: 'var_name', value: '{{valor}}' })} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-fuchsia-600 font-bold hover:bg-slate-200">+ Agregar</button>
                       </label>
                       <div className="space-y-2">
                          {bodyObj.map((b: any, i: number) => (
                             <div key={i} className="flex items-center gap-1">
                                <input placeholder="Clave" value={b.key} onChange={(e) => { const n = [...bodyObj]; n[i].key = e.target.value; handleChange('body', n) }} className="w-1/2 p-1.5 text-xs border border-slate-200 rounded bg-slate-50 outline-none" />
                                <input placeholder="Valor o {{var}}" value={b.value} onChange={(e) => { const n = [...bodyObj]; n[i].value = e.target.value; handleChange('body', n) }} className="w-1/2 p-1.5 text-xs border border-slate-200 rounded bg-slate-50 outline-none" />
                                <button onClick={() => { const n = [...bodyObj]; n.splice(i,1); handleChange('body', n) }}><X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500"/></button>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              );
          case 'closeTicket':
              return (
                  <div className="bg-red-50 text-red-800 p-4 rounded-xl text-[13px] border border-red-100 flex gap-3">
                      <XCircle className="w-6 h-6 shrink-0 text-red-500" />
                      <div><strong className="block mb-1">Cierra la conversación</strong>Marca el ticket como "Cerrado" inmediatamente y acaba el automatismo para que no repinte flujos circulares.</div>
                  </div>
              );
          case 'botHandoff':
              return (
                  <div className="bg-orange-50 text-orange-800 p-4 rounded-xl text-[13px] border border-orange-100 flex gap-3">
                      <UserCheck className="w-6 h-6 shrink-0 text-orange-500" />
                      <div><strong className="block mb-1">Pasa el Chat a Asesor Humano</strong>El bot se "Pausa" para esta conversación y el ticket entra en modo 'Espera' en el CRM, hasta que un humano lo resuelva.</div>
                  </div>
              );
          default:
              return <div className="text-sm text-slate-500">Configuración no disponible para este nodo.</div>;
      }
  };

  const getIcon = () => {
     switch(selectedNode.type) {
         case 'trigger': return <Zap className="w-4 h-4 text-emerald-500" />;
         case 'message': return <AlignLeft className="w-4 h-4 text-blue-500" />;
         case 'buttonMessage': return <ListPlus className="w-4 h-4 text-blue-500" />;
         case 'option': return <ListPlus className="w-4 h-4 text-amber-500" />;
         case 'wait': return <Clock className="w-4 h-4 text-slate-500" />;
         case 'condition': return <GitBranch className="w-4 h-4 text-emerald-500" />;
         case 'tag': return <Tag className="w-4 h-4 text-purple-500" />;
         case 'assign': return <UserPlus className="w-4 h-4 text-indigo-500" />;
         case 'capture': return <Database className="w-4 h-4 text-pink-500" />;
         case 'media': return <Image className="w-4 h-4 text-cyan-500" />;
         case 'timeRouting': return <CalendarClock className="w-4 h-4 text-orange-500" />;
         case 'apiCall': return <Webhook className="w-4 h-4 text-fuchsia-500" />;
         case 'closeTicket': return <XCircle className="w-4 h-4 text-red-500" />;
         case 'botHandoff': return <UserCheck className="w-4 h-4 text-orange-500" />;
         default: return <Settings className="w-4 h-4 text-slate-500" />;
     }
  };

  const getTitle = () => {
     switch(selectedNode.type) {
         case 'trigger': return 'Configurar Gatillo';
         case 'message': return 'Configurar Mensaje';
         case 'buttonMessage': return 'Configurar Botones';
         case 'option': return 'Configurar Menú';
         case 'wait': return 'Configurar Pausa';
         case 'condition': return 'Configurar Condición';
         case 'tag': return 'Añadir Etiqueta';
         case 'assign': return 'Asignar Agente';
         case 'capture': return 'Capturar Dato CRM';
         case 'media': return 'Configurar Archivo';
         case 'timeRouting': return 'Enrutamiento Horario';
         case 'apiCall': return 'Configurar HTTP / POST';
         case 'closeTicket': return 'Cerrar Conversación';
         case 'botHandoff': return 'Pausar Bot (Humano)';
         default: return 'Configuración';
     }
  };

  // ── Fullscreen overlay ──
  if (isFullscreen) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        />
        {/* Full Modal */}
        <div className="fixed inset-6 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200">
          {/* Header */}
          <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-xl shadow border border-slate-200 flex items-center justify-center">
                {getIcon()}
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-800">{getTitle()}</h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Modo Pantalla Completa</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-lg transition-colors"
                title="Salir de pantalla completa (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Minimizar
              </button>
              {onDeleteNode && (
                <button onClick={() => onDeleteNode(selectedNode.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar nodo">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body — full space */}
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl w-full mx-auto">
            {renderContent()}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFullscreen(false)} className="px-6 text-slate-600">
              Minimizar
            </Button>
            <Button className="bg-slate-800 hover:bg-slate-900 text-white px-8" onClick={onClose}>
              Listo
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ── Normal sidebar panel ──
  if (!mounted) return null;

  return (
      <div
        className="fixed left-6 top-1/2 -translate-y-1/2 w-[340px] bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl z-[9000] flex flex-col overflow-hidden transition-none max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
          {/* Panel Header */}
          <div 
            className="h-14 border-b border-slate-100/50 flex items-center justify-between px-4 shrink-0 bg-white/50"
          >
             <div className="flex items-center gap-2 pointer-events-none">
                 <div className="w-7 h-7 bg-white rounded shadow-sm border border-slate-100 flex items-center justify-center">
                    {getIcon()}
                 </div>
                 <h2 className="font-semibold text-sm text-slate-800">{getTitle()}</h2>
             </div>
             <div className="flex items-center gap-1">
               {onDeleteNode && (
                 <button
                   onClick={(e) => { e.stopPropagation(); onDeleteNode(selectedNode.id); }}
                   title="Eliminar nodo"
                   className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
               <button
                 onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                 title="Pantalla completa"
                 className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
               >
                 <Maximize2 className="w-4 h-4" />
               </button>
               <button
                 onClick={(e) => { e.stopPropagation(); onClose(); }}
                 className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
               >
                 <X className="w-4 h-4" />
               </button>
             </div>
          </div>

          {/* Panel Body — min-h-0 is CRITICAL for flex-1 to actually scroll */}
          <div className="flex-1 min-h-0 p-5 overflow-y-auto scrollbar-thin">
              {renderContent()}
          </div>
          
          {/* Panel Footer */}
          <div className="p-4 border-t border-slate-100/50 bg-white/50 shrink-0 flex gap-2">
             <button
               onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
               className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 px-3 py-2 rounded-xl transition-colors bg-white shadow-sm"
             >
               <Maximize2 className="w-3.5 h-3.5" />
               Expandir
             </button>
             <Button
               className="flex-1 bg-slate-800 hover:bg-slate-900 text-white shadow-md rounded-xl"
               onClick={(e) => { e.stopPropagation(); onClose(); }}
             >
                Listo
             </Button>
          </div>
      </div>
  );
}
