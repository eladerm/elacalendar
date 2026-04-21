import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Élapiel Depilación Láser — Bot de Bienvenida
 * Convertido desde formato Koomo → ReactFlow nodes + edges
 * 
 * Arquitectura del flujo:
 *  [TRIGGER: hola/info/start] → [MSG: Bienvenida + Servicios]
 *    → [OPT: Depilación Láser] → [MSG: Promo 2026 + Sucursales] → [MSG: Precio]
 *    → [OPT: Rejuvenecimiento] → [MSG: Hifu / Hollywood Peeling]
 *    → [OPT: Despigmentación]  → [MSG: Agenda tu cita sin costo]
 */

const ELAPIEL_BOT_NODES = [
  // ─── TRIGGER ───────────────────────────────────────────────────
  {
    id: 'trigger-start',
    type: 'trigger',
    data: { label: 'hola, info, inicio, start, depilación, quiero' },
    position: { x: 40, y: 300 },
  },

  // ─── BLOQUE 0: BIENVENIDA ──────────────────────────────────────
  {
    id: 'msg-bienvenida',
    type: 'buttonMessage',
    data: {
      label: '¡Hola! Bienvenida a ÉLAPIEL ✨ ¿En qué servicio estás interesad@?',
      buttons: ['Depilación Láser 🪄', 'Rejuvenecimiento 💆‍♀️', 'Despigmentación 🌟'],
    },
    position: { x: 380, y: 200 },
  },

  // ─── RAMA DEPILACIÓN LÁSER ─────────────────────────────────────
  {
    id: 'msg-promo-laser',
    type: 'buttonMessage',
    data: {
      label:
        '✨🚀 ¡EMPEZAMOS EL 2026 EN ELAPIEL! 🚀✨\n\n💫 Nuevo año, nueva piel\n\nEste 2026 es el momento perfecto para decirle adiós al vello y darle la bienvenida a una piel suave, luminosa y sin límites.\n\n💥 Sesiones GRATIS de depilación láser 😱\n\nCon equipos de alta gama, tecnología TETRALASER diseñada para lograr resultados efectivos y duraderos desde la primera sesión.\n\n🎁 Te obsequiamos una sesión demostrativa en la zona de interés SIN COSTO\n\n¿Qué hace el láser? 👇\n🔹 Elimina el vello desde la primera sesión\n🔹 Despigmenta la zona tratada\n🔹 Elimina la irritación por rasuradora\n\n⚡ Cupos limitados – Agenda HOY\n\n📅 ¿En qué sucursal te gustaría agendar?',
      buttons: ['Plaza de Toros 🏟️', 'Valle de los Chillos 🌿'],
    },
    position: { x: 760, y: 60 },
  },
  {
    id: 'msg-precio-laser',
    type: 'message',
    data: {
      label:
        'Depilación Láser 💎\n\nCon la promoción actual, si adquieres por paquete tenemos valores desde $15 por sesión, dependiendo de la zona y el número de sesiones que requiera tu folículo 🙂\n\n🎁 Sesión demostrativa en tu zona de interés\n✨ Evaluación gratuita\n⚡ Descuentos exclusivos solo por tiempo limitado\n\n¿Para qué día te gustaría agendar tu evaluación sin costo? 📅',
    },
    position: { x: 1160, y: 60 },
  },

  // ─── RAMA REJUVENECIMIENTO ─────────────────────────────────────
  {
    id: 'msg-rejuve',
    type: 'buttonMessage',
    data: {
      label: '¡Excelente elección! 💆‍♀️ Contamos con los mejores tratamientos de rejuvenecimiento. Escoge una opción:',
      buttons: ['Hifu – Lifting Facial 🏋️', 'Hollywood Peeling ⭐'],
    },
    position: { x: 760, y: 340 },
  },

  // ─── RAMA DESPIGMENTACIÓN ──────────────────────────────────────
  {
    id: 'msg-despig',
    type: 'buttonMessage',
    data: {
      label:
        '🌟 ¡La despigmentación es una de nuestras especialidades!\n\nCon tecnología de punta logramos resultados visibles desde la primera sesión.\n\n🎁 Te ofrecemos una evaluación gratuita para ver qué tratamiento es el ideal para ti.\n\n📅 ¿En qué sucursal prefieres tu cita?',
      buttons: ['Plaza de Toros 🏟️', 'Valle de los Chillos 🌿'],
    },
    position: { x: 760, y: 560 },
  },

  // ─── NODO DE ESPERA / NO RESPUESTA ────────────────────────────
  {
    id: 'wait-60s',
    type: 'wait',
    data: { label: 'Esperar 60 segundos sin respuesta', seconds: 60 },
    position: { x: 760, y: 780 },
  },

  // ─── NODO DE CIERRE / FALLBACK ─────────────────────────────────
  {
    id: 'msg-fallback',
    type: 'message',
    data: {
      label:
        '¿Sigues por aquí? 😊 Recuerda que puedes agendar tu cita gratuita en cualquier momento. Nuestro equipo está listo para ayudarte. ¡Escríbenos cuando quieras! 💜',
    },
    position: { x: 1160, y: 780 },
  },
];

const ELAPIEL_BOT_EDGES = [
  // Trigger → Bienvenida
  { id: 'e-trigger-bienvenida', source: 'trigger-start', target: 'msg-bienvenida', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } },
  // Bienvenida → Ramas
  { id: 'e-bienvenida-laser',    source: 'msg-bienvenida', sourceHandle: 'btn-0', target: 'msg-promo-laser', animated: true, style: { stroke: '#a78bfa', strokeWidth: 2 }, label: 'Depilación Láser 🪄' },
  { id: 'e-bienvenida-rejuve',   source: 'msg-bienvenida', sourceHandle: 'btn-1', target: 'msg-rejuve',      animated: true, style: { stroke: '#f472b6', strokeWidth: 2 }, label: 'Rejuvenecimiento 💆‍♀️' },
  { id: 'e-bienvenida-despig',   source: 'msg-bienvenida', sourceHandle: 'btn-2', target: 'msg-despig',      animated: true, style: { stroke: '#fbbf24', strokeWidth: 2 }, label: 'Despigmentación 🌟' },
  // Promo Láser → Precio
  { id: 'e-laser-precio',        source: 'msg-promo-laser', target: 'msg-precio-laser', animated: true, style: { stroke: '#60a5fa', strokeWidth: 2 } },
  // No respuesta → Wait → Fallback
  { id: 'e-bienvenida-wait',     source: 'msg-bienvenida', target: 'wait-60s', animated: false, style: { stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '5,5' }, label: 'Sin respuesta' },
  { id: 'e-wait-fallback',       source: 'wait-60s',        target: 'msg-fallback', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
];

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin no inicializado' }, { status: 500 });
    }

    // Verificar si el bot ya existe para no duplicarlo
    const existing = await adminDb.collection('crm_chatbots')
      .where('name', '==', 'Élapiel – Depilación Láser 🪄')
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({
        success: true,
        id: existing.docs[0].id,
        message: 'El bot ya existía, no se duplicó.',
        alreadyExists: true,
      });
    }

    const botDoc = {
      name: 'Élapiel – Depilación Láser 🪄',
      description: 'Flujo de bienvenida para captar leads de Depilación Láser, Rejuvenecimiento y Despigmentación. Importado desde Koomo.',
      active: false,
      aiFallback: true,
      triggerKeywords: ['hola', 'info', 'inicio', 'start', 'depilación', 'quiero', 'precio'],
      assignedWaId: '',
      nodes: ELAPIEL_BOT_NODES,
      edges: ELAPIEL_BOT_EDGES,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('crm_chatbots').add(botDoc);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: '✅ Bot "Élapiel – Depilación Láser" creado exitosamente en Firestore.',
      nodesCount: ELAPIEL_BOT_NODES.length,
      edgesCount: ELAPIEL_BOT_EDGES.length,
    });
  } catch (error: any) {
    console.error('❌ Error seeding bot:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
