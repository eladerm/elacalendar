import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
/**
 * Élapiel Depilación Láser — Bot Maestro Único
 *
 * LAYOUT:
 *
 *                          [TRIGGER]
 *                              ↓
 *                       [BIENVENIDA - 3 botones]
 *            ┌───────────────┼───────────────┐
 *          LEFT           CENTER           RIGHT
 *    [Depilación Láser] [Rejuvenec.] [Despigmentación]
 *          ↓                  ↓               ↓
 *    [Promo Láser]      [Sub-menú]      [Sub-menú Despig]
 *          ↓                  ↓               ↓
 *    [Zonas Zona]       [Hifu / Peel]   [Evaluación]
 *          ↓                               ↓
 *    [Captura nombre]                 [Captura nombre]
 *          ↓
 *    [Precio + agenda]
 *          ↓
 *    [Captura nombre]
 *          ↓
 *    [Asignar agente]
 *          ↓ (timeout / sin respuesta)
 *    [Wait 60s] → [Fallback] → [Cerrar Ticket]
 */

// X positions for each service branch
const X_LEFT   = 60;    // Depilación Láser
const X_CENTER = 560;   // Rejuvenecimiento
const X_RIGHT  = 1060;  // Despigmentación

const ELAPIEL_BOT_NODES = [

  // ─── TRIGGER ──────────────────────────────────────────────────────────────
  {
    id: 'trigger-start',
    type: 'trigger',
    data: { label: 'hola, info, inicio, start, depilación, quiero, precio, cita' },
    position: { x: 380, y: 0 },
  },

  // ─── BIENVENIDA (MENÚ PRINCIPAL) ──────────────────────────────────────────
  {
    id: 'msg-bienvenida',
    type: 'buttonMessage',
    data: {
      label: '¡Hola! Bienvenida a ÉLAPIEL ✨\n\nSomos especialistas en tratamientos estéticos de alta tecnología.\n\n¿En qué servicio estás interesad@?',
      buttons: ['Depilación Láser 🪄', 'Rejuvenecimiento 💆‍♀️', 'Despigmentación 🌟'],
    },
    position: { x: 260, y: 160 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RAMA IZQUIERDA — DEPILACIÓN LÁSER
  // ═══════════════════════════════════════════════════════════════════════════

  // Promoción principal
  {
    id: 'msg-promo-laser',
    type: 'message',
    data: {
      label: '✨🚀 ¡EMPEZAMOS EL 2026 EN ÉLAPIEL! 🚀✨\n\n💫 Nuevo año, nueva piel – Es el momento perfecto para decirle adiós al vello.\n\n💥 Sesiones GRATIS de depilación láser 😱\n\nTecnología TETRALASER — resultados efectivos y duraderos desde la 1ª sesión.\n\n🎁 Te obsequiamos una sesión demostrativa SIN COSTO en la zona de tu interés.\n\n¿Qué hace el láser?\n🔹 Elimina el vello desde la primera sesión\n🔹 Despigmenta la zona tratada\n🔹 Elimina la irritación por rasuradora\n\n⚡ Cupos limitados — ¡Agenda HOY!',
    },
    position: { x: X_LEFT, y: 380 },
  },

  // Selección de sucursal
  {
    id: 'msg-sucursal-laser',
    type: 'buttonMessage',
    data: {
      label: '📅 ¿En qué sucursal te gustaría agendar tu evaluación gratuita?',
      buttons: ['Plaza de Toros 🏟️', 'Valle de los Chillos 🌿'],
    },
    position: { x: X_LEFT, y: 600 },
  },

  // Captura zona
  {
    id: 'capture-zona-laser',
    type: 'capture',
    data: {
      question: '¡Perfecto! ¿Cuál es la zona que te gustaría tratar? (Ej: piernas, axilas, bikini, rostro...)',
      crmField: 'zona_interes',
    },
    position: { x: X_LEFT, y: 800 },
  },

  // Precio y detalles
  {
    id: 'msg-precio-laser',
    type: 'message',
    data: {
      label: 'Depilación Láser 💎\n\nCon la promoción actual, los paquetes inician desde $15 por sesión dependiendo de la zona y el número de sesiones que requiera tu folículo 🙂\n\n🎁 Sesión demostrativa GRATUITA\n✨ Evaluación sin costo\n⚡ Descuentos exclusivos por tiempo limitado\n\n¿Para qué día te gustaría agendar tu evaluación? 📅',
    },
    position: { x: X_LEFT, y: 1000 },
  },

  // Captura nombre
  {
    id: 'capture-nombre-laser',
    type: 'capture',
    data: {
      question: '¡Excelente! Para reservarte el cupo, ¿cuál es tu nombre completo? 😊',
      crmField: 'nombre_cliente',
    },
    position: { x: X_LEFT, y: 1200 },
  },

  // Captura teléfono
  {
    id: 'capture-telefono-laser',
    type: 'capture',
    data: {
      question: 'Perfecto, ¿y tu número de teléfono para confirmarte la cita? 📱',
      crmField: 'telefono',
    },
    position: { x: X_LEFT, y: 1400 },
  },

  // Asignar agente
  {
    id: 'assign-laser',
    type: 'assign',
    data: { department: 'Ventas – Depilación Láser' },
    position: { x: X_LEFT, y: 1600 },
  },

  // Confirmación cita láser
  {
    id: 'msg-confirmacion-laser',
    type: 'message',
    data: {
      label: '¡Todo listo! ✅\n\nUno de nuestros asesores se comunicará contigo en los próximos minutos para confirmar tu cita gratuita. 🗓️\n\n¡Te esperamos en ÉLAPIEL! 💜✨',
    },
    position: { x: X_LEFT, y: 1800 },
  },

  // Tag interesada en láser
  {
    id: 'tag-laser',
    type: 'tag',
    data: { tags: ['Interesada Láser', 'Lead Calificado', '2026'] },
    position: { x: X_LEFT, y: 2000 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RAMA CENTRAL — REJUVENECIMIENTO
  // ═══════════════════════════════════════════════════════════════════════════

  // Sub-menú rejuvenecimiento
  {
    id: 'msg-rejuve',
    type: 'buttonMessage',
    data: {
      label: '¡Excelente elección! 💆‍♀️\n\nContamos con los mejores tratamientos de rejuvenecimiento facial con tecnología de última generación.\n\n¿Qué tratamiento te interesa?',
      buttons: ['Hifu – Lifting Facial 🏋️', 'Hollywood Peeling ⭐'],
    },
    position: { x: X_CENTER, y: 380 },
  },

  // HIFU
  {
    id: 'msg-hifu',
    type: 'message',
    data: {
      label: '🏋️ HIFU – Lifting Facial sin Cirugía\n\nEl ultrasonido focalizado de alta intensidad estimula el colágeno en las capas más profundas de tu piel, logrando un efecto lifting visible y duradero.\n\n✅ Resultado desde la 1ª sesión\n✅ Sin tiempo de recuperación\n✅ Efecto hasta 18 meses\n✅ Apto para todo tipo de piel\n\n🎁 Evaluación facial GRATUITA para determinar el protocolo ideal para ti.',
    },
    position: { x: X_CENTER - 150, y: 600 },
  },

  // Hollywood Peeling
  {
    id: 'msg-peeling',
    type: 'message',
    data: {
      label: '⭐ Hollywood Peeling – Piel de Celebridad\n\nTratamiento de carbono activo combinado con láser Q-Switched para exfoliar, limpiar y rejuvenecer tu piel.\n\n✅ Piel luminosa desde el primer día\n✅ Reduce poros dilatados\n✅ Elimina manchas superficiales\n✅ Sin dolor ni tiempo de recuperación\n\n🎁 Primera sesión con evaluación gratuita.',
    },
    position: { x: X_CENTER + 150, y: 600 },
  },

  // Captura nombre rejuvenecimiento
  {
    id: 'capture-nombre-rejuve',
    type: 'capture',
    data: {
      question: '¡Me parece perfecto! 🌟 Para agendarte una evaluación sin costo, ¿cuál es tu nombre? 😊',
      crmField: 'nombre_cliente',
    },
    position: { x: X_CENTER, y: 820 },
  },

  // Captura teléfono rejuvenecimiento
  {
    id: 'capture-telefono-rejuve',
    type: 'capture',
    data: {
      question: '¿Y tu número de WhatsApp para coordinar la cita? 📱',
      crmField: 'telefono',
    },
    position: { x: X_CENTER, y: 1020 },
  },

  // Asignar agente rejuvenecimiento
  {
    id: 'assign-rejuve',
    type: 'assign',
    data: { department: 'Ventas – Rejuvenecimiento' },
    position: { x: X_CENTER, y: 1220 },
  },

  // Confirmación rejuvenecimiento
  {
    id: 'msg-confirmacion-rejuve',
    type: 'message',
    data: {
      label: '¡Perfecto! ✅\n\nNuestro equipo de expertos en rejuvenecimiento se comunicará contigo muy pronto para confirmar tu cita gratuita. 💆‍♀️\n\n¡Te esperamos en ÉLAPIEL! 💜✨',
    },
    position: { x: X_CENTER, y: 1420 },
  },

  // Tag rejuvenecimiento
  {
    id: 'tag-rejuve',
    type: 'tag',
    data: { tags: ['Interesada Rejuvenecimiento', 'Lead Calificado'] },
    position: { x: X_CENTER, y: 1620 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RAMA DERECHA — DESPIGMENTACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  // Info despigmentación
  {
    id: 'msg-despig',
    type: 'message',
    data: {
      label: '🌟 ¡La despigmentación es una de nuestras grandes especialidades!\n\nCon tecnología de punta logramos resultados visibles desde la primera sesión, eliminando manchas, melasma, hiperpigmentación y marcas de acné.\n\n✅ Tratamiento personalizado\n✅ Resultados desde la 1ª sesión\n✅ Combinamos láser + bioestimuladores\n✅ Evaluación inicial GRATUITA',
    },
    position: { x: X_RIGHT, y: 380 },
  },

  // Sucursal despigmentación
  {
    id: 'msg-sucursal-despig',
    type: 'buttonMessage',
    data: {
      label: '📅 ¿En qué sucursal prefieres tu evaluación gratuita de despigmentación?',
      buttons: ['Plaza de Toros 🏟️', 'Valle de los Chillos 🌿'],
    },
    position: { x: X_RIGHT, y: 600 },
  },

  // Captura nombre despigmentación
  {
    id: 'capture-nombre-despig',
    type: 'capture',
    data: {
      question: '¡Excelente! 🌟 ¿Cuál es tu nombre para apartar tu evaluación? 😊',
      crmField: 'nombre_cliente',
    },
    position: { x: X_RIGHT, y: 800 },
  },

  // Captura teléfono despigmentación
  {
    id: 'capture-telefono-despig',
    type: 'capture',
    data: {
      question: '¿Tu número de WhatsApp para confirmar la cita? 📱',
      crmField: 'telefono',
    },
    position: { x: X_RIGHT, y: 1000 },
  },

  // Asignar agente despigmentación
  {
    id: 'assign-despig',
    type: 'assign',
    data: { department: 'Ventas – Despigmentación' },
    position: { x: X_RIGHT, y: 1200 },
  },

  // Confirmación despigmentación
  {
    id: 'msg-confirmacion-despig',
    type: 'message',
    data: {
      label: '¡Todo coordinado! ✅\n\nUn asesor especializado te contactará pronto para confirmar tu cita de evaluación sin costo. 🌟\n\n¡Te esperamos para transformar tu piel en ÉLAPIEL! 💜✨',
    },
    position: { x: X_RIGHT, y: 1400 },
  },

  // Tag despigmentación
  {
    id: 'tag-despig',
    type: 'tag',
    data: { tags: ['Interesada Despigmentación', 'Lead Calificado'] },
    position: { x: X_RIGHT, y: 1600 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RAMA INFERIOR — SIN RESPUESTA / FALLBACK / CIERRE
  // ═══════════════════════════════════════════════════════════════════════════

  // Espera 90 segundos sin respuesta
  {
    id: 'wait-no-respuesta',
    type: 'wait',
    data: { label: 'Sin respuesta del cliente', seconds: 90, unit: 'segundos' },
    position: { x: 560, y: 2200 },
  },

  // Mensaje de reactivación
  {
    id: 'msg-fallback',
    type: 'message',
    data: {
      label: '¿Sigues por aquí? 😊\n\nRecuerda que puedes agendar tu evaluación gratuita en cualquier momento. Nuestro equipo está listo para ayudarte.\n\n📞 También puedes llamarnos directamente.\n\n¡Escríbenos cuando quieras! 💜',
    },
    position: { x: 560, y: 2400 },
  },

  // Verificación horario antes de cerrar
  {
    id: 'time-routing-final',
    type: 'timeRouting',
    data: {
      label: 'Verificar horario de atención',
      timezone: 'America/Guayaquil',
      businessHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
    },
    position: { x: 560, y: 2600 },
  },

  // Pasar a humano si está en horario
  {
    id: 'handoff-humano',
    type: 'botHandoff',
    data: { label: 'Transferir a agente disponible' },
    position: { x: 300, y: 2800 },
  },

  // Cerrar ticket fuera de horario
  {
    id: 'close-ticket-final',
    type: 'closeTicket',
    data: { label: 'Resolver y cerrar conversación' },
    position: { x: 820, y: 2800 },
  },

];

const ELAPIEL_BOT_EDGES = [

  // ─── TRIGGER → BIENVENIDA ─────────────────────────────────────────────────
  {
    id: 'e-trigger-bienvenida',
    source: 'trigger-start',
    target: 'msg-bienvenida',
    animated: true,
    type: 'straight',
    style: { stroke: '#25D366', strokeWidth: 2 },
  },

  // ─── BIENVENIDA → RAMAS (IZQUIERDA / CENTRO / DERECHA) ───────────────────
  {
    id: 'e-bienvenida-laser',
    source: 'msg-bienvenida',
    sourceHandle: 'btn-0',
    target: 'msg-promo-laser',
    animated: true,
    type: 'straight',
    label: 'Depilación Láser 🪄',
    style: { stroke: '#a78bfa', strokeWidth: 2 },
  },
  {
    id: 'e-bienvenida-rejuve',
    source: 'msg-bienvenida',
    sourceHandle: 'btn-1',
    target: 'msg-rejuve',
    animated: true,
    type: 'straight',
    label: 'Rejuvenecimiento 💆‍♀️',
    style: { stroke: '#f472b6', strokeWidth: 2 },
  },
  {
    id: 'e-bienvenida-despig',
    source: 'msg-bienvenida',
    sourceHandle: 'btn-2',
    target: 'msg-despig',
    animated: true,
    type: 'straight',
    label: 'Despigmentación 🌟',
    style: { stroke: '#fbbf24', strokeWidth: 2 },
  },

  // ─── RAMA LÁSER ───────────────────────────────────────────────────────────
  { id: 'e-laser-sucursal',    source: 'msg-promo-laser',       target: 'msg-sucursal-laser',      animated: true, type: 'straight', style: { stroke: '#a78bfa', strokeWidth: 2 } },
  { id: 'e-sucursal-zona',     source: 'msg-sucursal-laser',    target: 'capture-zona-laser',      animated: true, type: 'straight', style: { stroke: '#a78bfa', strokeWidth: 2 } },
  { id: 'e-zona-precio',       source: 'capture-zona-laser',    target: 'msg-precio-laser',        animated: true, type: 'straight', style: { stroke: '#a78bfa', strokeWidth: 2 } },
  { id: 'e-precio-nombre',     source: 'msg-precio-laser',      target: 'capture-nombre-laser',    animated: true, type: 'straight', style: { stroke: '#a78bfa', strokeWidth: 2 } },
  { id: 'e-nombre-tel-laser',  source: 'capture-nombre-laser',  target: 'capture-telefono-laser',  animated: true, type: 'straight', style: { stroke: '#a78bfa', strokeWidth: 2 } },
  { id: 'e-tel-assign-laser',  source: 'capture-telefono-laser',target: 'assign-laser',            animated: true, type: 'straight', style: { stroke: '#a78bfa', strokeWidth: 2 } },
  { id: 'e-assign-confirm-l',  source: 'assign-laser',          target: 'msg-confirmacion-laser',  animated: true, type: 'straight', style: { stroke: '#a78bfa', strokeWidth: 2 } },
  { id: 'e-confirm-tag-laser', source: 'msg-confirmacion-laser',target: 'tag-laser',               animated: true, type: 'straight', style: { stroke: '#a78bfa', strokeWidth: 2 } },

  // ─── RAMA REJUVENECIMIENTO ────────────────────────────────────────────────
  { id: 'e-rejuve-hifu',       source: 'msg-rejuve',            sourceHandle: 'btn-0', target: 'msg-hifu',                animated: true, type: 'straight', style: { stroke: '#f472b6', strokeWidth: 2 }, label: 'Hifu 🏋️' },
  { id: 'e-rejuve-peeling',    source: 'msg-rejuve',            sourceHandle: 'btn-1', target: 'msg-peeling',             animated: true, type: 'straight', style: { stroke: '#f472b6', strokeWidth: 2 }, label: 'Peeling ⭐' },
  { id: 'e-hifu-capnombre',    source: 'msg-hifu',              target: 'capture-nombre-rejuve',   animated: true, type: 'straight', style: { stroke: '#f472b6', strokeWidth: 2 } },
  { id: 'e-peeling-capnombre', source: 'msg-peeling',           target: 'capture-nombre-rejuve',   animated: true, type: 'straight', style: { stroke: '#f472b6', strokeWidth: 2 } },
  { id: 'e-nombre-tel-rejuve', source: 'capture-nombre-rejuve', target: 'capture-telefono-rejuve', animated: true, type: 'straight', style: { stroke: '#f472b6', strokeWidth: 2 } },
  { id: 'e-tel-assign-rejuve', source: 'capture-telefono-rejuve',target: 'assign-rejuve',          animated: true, type: 'straight', style: { stroke: '#f472b6', strokeWidth: 2 } },
  { id: 'e-assign-confirm-r',  source: 'assign-rejuve',         target: 'msg-confirmacion-rejuve', animated: true, type: 'straight', style: { stroke: '#f472b6', strokeWidth: 2 } },
  { id: 'e-confirm-tag-rejuve',source: 'msg-confirmacion-rejuve',target: 'tag-rejuve',             animated: true, type: 'straight', style: { stroke: '#f472b6', strokeWidth: 2 } },

  // ─── RAMA DESPIGMENTACIÓN ─────────────────────────────────────────────────
  { id: 'e-despig-sucursal',   source: 'msg-despig',            target: 'msg-sucursal-despig',     animated: true, type: 'straight', style: { stroke: '#fbbf24', strokeWidth: 2 } },
  { id: 'e-sucursal-nomd',     source: 'msg-sucursal-despig',   target: 'capture-nombre-despig',   animated: true, type: 'straight', style: { stroke: '#fbbf24', strokeWidth: 2 } },
  { id: 'e-nomd-teld',         source: 'capture-nombre-despig', target: 'capture-telefono-despig', animated: true, type: 'straight', style: { stroke: '#fbbf24', strokeWidth: 2 } },
  { id: 'e-teld-assignd',      source: 'capture-telefono-despig',target: 'assign-despig',          animated: true, type: 'straight', style: { stroke: '#fbbf24', strokeWidth: 2 } },
  { id: 'e-assign-confirm-d',  source: 'assign-despig',         target: 'msg-confirmacion-despig', animated: true, type: 'straight', style: { stroke: '#fbbf24', strokeWidth: 2 } },
  { id: 'e-confirm-tag-despig',source: 'msg-confirmacion-despig',target: 'tag-despig',             animated: true, type: 'straight', style: { stroke: '#fbbf24', strokeWidth: 2 } },

  // ─── FALLBACK / SIN RESPUESTA ─────────────────────────────────────────────
  {
    id: 'e-bienvenida-wait',
    source: 'msg-bienvenida',
    target: 'wait-no-respuesta',
    animated: false,
    type: 'straight',
    label: 'Sin respuesta',
    style: { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '6,4' },
  },
  { id: 'e-wait-fallback',     source: 'wait-no-respuesta',    target: 'msg-fallback',            animated: true, type: 'straight', style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e-fallback-time',     source: 'msg-fallback',         target: 'time-routing-final',      animated: true, type: 'straight', style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e-time-handoff',      source: 'time-routing-final',   sourceHandle: 'in_hours',  target: 'handoff-humano',      animated: true, type: 'straight', label: 'En horario',  style: { stroke: '#10b981', strokeWidth: 2 } },
  { id: 'e-time-close',        source: 'time-routing-final',   sourceHandle: 'out_hours', target: 'close-ticket-final',  animated: true, type: 'straight', label: 'Fuera horario', style: { stroke: '#ef4444', strokeWidth: 2 } },

];

export async function POST(req: NextRequest) {
  try {
    const chatbotsCol = collection(db, 'crm_chatbots');

    // Delete ALL existing bots so we have only ONE master flow
    const existing = await getDocs(chatbotsCol);
    const deletePromises = existing.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    const botDoc = {
      name: 'Élapiel – Bot Maestro 🪄',
      description:
        'Flujo único completo: Depilación Láser, Rejuvenecimiento y Despigmentación. Captura datos, asigna agentes y gestiona el fallback con enrutamiento por horario.',
      active: true,
      aiFallback: true,
      triggerKeywords: ['hola', 'info', 'inicio', 'start', 'depilación', 'quiero', 'precio', 'cita', 'tratamiento'],
      assignedWaId: '',
      nodes: ELAPIEL_BOT_NODES,
      edges: ELAPIEL_BOT_EDGES,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(chatbotsCol, botDoc);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: '✅ Bot Maestro "Élapiel" creado exitosamente. Flujos anteriores eliminados.',
      nodesCount: ELAPIEL_BOT_NODES.length,
      edgesCount: ELAPIEL_BOT_EDGES.length,
    });
  } catch (error: any) {
    console.error('❌ Error seeding bot:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
