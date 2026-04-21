import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const app = initializeApp({ projectId: 'studio-3620711772-b2859' });
const db = getFirestore(app);

const edge = (id: string, source: string, target: string, color = '#10b981') => ({
  id, source, target, animated: true, style: { stroke: color, strokeWidth: 2 }
});

// ─────────────────────────────────────────────────────────────────────────────
// BOT 1: DEPILACIÓN LÁSER 4D
// ─────────────────────────────────────────────────────────────────────────────
const depilacionBot = {
  name: 'Bot — Depilación Láser 4D',
  active: true,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  nodes: [
    {
      id: 'trigger-1', type: 'trigger',
      data: { label: 'depilacion, láser, laser, vello, depilo, depilar, 4d' },
      position: { x: 50, y: 200 }
    },
    {
      id: 'msg-1', type: 'message',
      data: { label: '¡Hola! ✨ Bienvenida/o a *ÉLAPIEL*.\n\nSoy Ela, tu asesora de tratamientos. Me cuenta que te interesa la *Depilación Láser 4D* 💜\n\n¿En qué área deseas hacer el tratamiento?' },
      position: { x: 350, y: 200 }
    },
    {
      id: 'btn-1', type: 'buttonMessage',
      data: {
        label: 'Selecciona la zona de tu interés:',
        buttons: ['Zona facial', 'Zona corporal', 'Paquete completo']
      },
      position: { x: 650, y: 200 }
    },
    {
      id: 'msg-2', type: 'message',
      data: { label: '¡Excelente elección! 🌟\n\nNuestra *Depilación Láser 4D* utiliza tecnología de vanguardia que actúa en todos los fototipos de piel, eliminando el vello de forma progresiva y segura.\n\n✓ Sin dolor\n✓ Sin efectos secundarios\n✓ Resultados permanentes\n\n🎁 *Incluye demostración gratuita* en la zona de tu interés.' },
      position: { x: 950, y: 200 }
    },
    {
      id: 'capture-1', type: 'capture',
      data: { question: '¿Cuál es tu nombre completo? Así podemos personalizar tu atención 😊', crmField: 'contact.name' },
      position: { x: 1250, y: 200 }
    },
    {
      id: 'capture-2', type: 'capture',
      data: { question: 'Perfecto ✅ ¿Cuál es tu número de teléfono o WhatsApp para confirmar tu cita?', crmField: 'contact.phone' },
      position: { x: 1550, y: 200 }
    },
    {
      id: 'assign-1', type: 'assign',
      data: { department: 'Ventas' },
      position: { x: 1850, y: 200 }
    },
    {
      id: 'tag-1', type: 'tag',
      data: { tags: ['depilacion-laser', 'lead-caliente', 'evaluacion-pendiente'] },
      position: { x: 2150, y: 200 }
    },
    {
      id: 'msg-final', type: 'message',
      data: { label: '¡Listo! 🎉 Una de nuestras especialistas se pondrá en contacto contigo muy pronto para *agendar tu demostración gratuita*.\n\nEn ÉLAPIEL nos comprometemos a ofrecerte los mejores resultados. ¡Hasta pronto! 💜' },
      position: { x: 2450, y: 200 }
    },
  ],
  edges: [
    edge('e1', 'trigger-1', 'msg-1'),
    edge('e2', 'msg-1', 'btn-1'),
    edge('e3', 'btn-1', 'msg-2'),
    edge('e4', 'msg-2', 'capture-1'),
    edge('e5', 'capture-1', 'capture-2'),
    edge('e6', 'capture-2', 'assign-1'),
    edge('e7', 'assign-1', 'tag-1'),
    edge('e8', 'tag-1', 'msg-final'),
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// BOT 2: HIFU 12D
// ─────────────────────────────────────────────────────────────────────────────
const hifuBot = {
  name: 'Bot — HIFU 12D (Lifting sin cirugía)',
  active: true,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  nodes: [
    {
      id: 'trigger-1', type: 'trigger',
      data: { label: 'hifu, lifting, papada, flacidez, bichectomia, rostro, reafirmar, sin cirugía' },
      position: { x: 50, y: 200 }
    },
    {
      id: 'msg-1', type: 'message',
      data: { label: '¡Hola! ✨ Gracias por contactar a *ÉLAPIEL*.\n\nSoy Ela, tu asesora. Me alegra que te intereses en nuestro tratamiento estrella:\n\n*HIFU 12D* — Lifting facial sin cirugía con ultrasonido focalizado 🔹' },
      position: { x: 350, y: 200 }
    },
    {
      id: 'btn-1', type: 'buttonMessage',
      data: {
        label: '¿Cuál es tu principal preocupación?',
        buttons: ['Flacidez facial', 'Papada / Papada doble', 'Redefinir óvalo']
      },
      position: { x: 650, y: 200 }
    },
    {
      id: 'msg-2', type: 'message',
      data: { label: 'Perfecto, *HIFU 12D* es ideal para eso ✅\n\n✓ *Lifting facial* sin bisturí ni anestesia\n✓ *Efecto bichectomía* sin cirugía\n✓ *Reducción de papada* visible desde la primera sesión\n✓ Mejora la firmeza y redefine el óvalo facial\n\n🎁 Al realizarte HIFU 12D, *te obsequiamos una limpieza facial*.\n\nEl tratamiento se personaliza según tu grado de flacidez y características de piel.' },
      position: { x: 950, y: 200 }
    },
    {
      id: 'condition-1', type: 'condition',
      data: { condition: 'precio, cuánto, costo, cuanto vale, valor' },
      position: { x: 1250, y: 200 }
    },
    {
      id: 'msg-precio', type: 'message',
      data: { label: '✨ Para brindarte la mejor asesoría y un valor exacto según el grado de flacidez, primero la especialista debe evaluarte de forma *gratuita y sin compromiso*.\n\n¿Te agendo tu cupo para la evaluación?' },
      position: { x: 1550, y: 100 }
    },
    {
      id: 'capture-1', type: 'capture',
      data: { question: '¡Genial! ¿Cuál es tu nombre completo? 😊', crmField: 'contact.name' },
      position: { x: 1850, y: 200 }
    },
    {
      id: 'capture-2', type: 'capture',
      data: { question: 'Y tu número de WhatsApp para confirmar la cita:', crmField: 'contact.phone' },
      position: { x: 2150, y: 200 }
    },
    {
      id: 'tag-1', type: 'tag',
      data: { tags: ['hifu-12d', 'lifting', 'evaluacion-pendiente'] },
      position: { x: 2450, y: 200 }
    },
    {
      id: 'assign-1', type: 'assign',
      data: { department: 'Ventas' },
      position: { x: 2750, y: 200 }
    },
    {
      id: 'msg-final', type: 'message',
      data: { label: '¡Perfecto! 🌟 Una especialista de ÉLAPIEL te contactará pronto para *confirmar tu evaluación gratuita de HIFU 12D*.\n\n¡Pronto verás los resultados que mereces! 💜' },
      position: { x: 3050, y: 200 }
    },
  ],
  edges: [
    edge('e1', 'trigger-1', 'msg-1'),
    edge('e2', 'msg-1', 'btn-1'),
    edge('e3', 'btn-1', 'msg-2'),
    edge('e4', 'msg-2', 'condition-1'),
    edge('e5', 'condition-1', 'msg-precio', '#f59e0b'),
    edge('e6', 'condition-1', 'capture-1', '#10b981'),
    edge('e7', 'msg-precio', 'capture-1'),
    edge('e8', 'capture-1', 'capture-2'),
    edge('e9', 'capture-2', 'tag-1'),
    edge('e10', 'tag-1', 'assign-1'),
    edge('e11', 'assign-1', 'msg-final'),
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// BOT 3: HOLLYWOOD PEELING (Rejuvenecimiento Facial con Láser)
// ─────────────────────────────────────────────────────────────────────────────
const hollywoodPeelingBot = {
  name: 'Bot — Hollywood Peeling (Rejuvenecimiento Láser)',
  active: true,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  nodes: [
    {
      id: 'trigger-1', type: 'trigger',
      data: { label: 'hollywood peeling, rejuvenecimiento, colágeno, poros, luminosidad, manchas, exfoliacion, peeling' },
      position: { x: 50, y: 200 }
    },
    {
      id: 'msg-1', type: 'message',
      data: { label: '¡Hola! ✨ Soy Ela de *ÉLAPIEL*.\n\n¡Qué buena elección! El *Hollywood Peeling* es uno de nuestros tratamientos más solicitados.\n\n¿Cuál es tu principal preocupación con tu piel?' },
      position: { x: 350, y: 200 }
    },
    {
      id: 'btn-1', type: 'buttonMessage',
      data: {
        label: 'Selecciona lo que más te preocupa:',
        buttons: ['Manchas / tono desuniforme', 'Poros abiertos y textura', 'Líneas de expresión']
      },
      position: { x: 650, y: 200 }
    },
    {
      id: 'msg-2', type: 'message',
      data: { label: '¡Tenemos la solución perfecta para ti! 💜\n\nEl *Hollywood Peeling* es un tratamiento láser no invasivo que:\n\n✓ *Estimula la producción de colágeno* de forma natural\n✓ Mejora la *textura y luminosidad* de la piel\n✓ Atenúa *manchas* y unifica el tono\n✓ Reduce *poros abiertos*\n✓ Atenúa *líneas de expresión superficiales*\n\n🎁 *Incluye limpieza facial gratuita* con cada sesión.\n\nEs 100% seguro y sin tiempo de recuperación.' },
      position: { x: 950, y: 200 }
    },
    {
      id: 'wait-1', type: 'wait',
      data: { seconds: 2, unit: 'seg' },
      position: { x: 1250, y: 200 }
    },
    {
      id: 'msg-3', type: 'message',
      data: { label: 'Para obtener los mejores resultados, realizamos una *evaluación gratuita* donde analizamos:\n\n🔍 Tipo de piel\n🔍 Grado de pigmentación\n🔍 Número de sesiones recomendadas\n\nAsí diseñamos un tratamiento 100% personalizado para ti.\n\n¿Te gustaría agendar tu evaluación sin costo?' },
      position: { x: 1550, y: 200 }
    },
    {
      id: 'capture-1', type: 'capture',
      data: { question: '¡Perfecto! ¿Cuál es tu nombre completo? 😊', crmField: 'contact.name' },
      position: { x: 1850, y: 200 }
    },
    {
      id: 'capture-2', type: 'capture',
      data: { question: 'Tu número de WhatsApp para confirmar la cita:', crmField: 'contact.phone' },
      position: { x: 2150, y: 200 }
    },
    {
      id: 'capture-3', type: 'capture',
      data: { question: '¿Cuál es tu correo electrónico? (opcional, para enviarte información adicional)', crmField: 'contact.email' },
      position: { x: 2450, y: 200 }
    },
    {
      id: 'tag-1', type: 'tag',
      data: { tags: ['hollywood-peeling', 'rejuvenecimiento-laser', 'evaluacion-pendiente'] },
      position: { x: 2750, y: 200 }
    },
    {
      id: 'assign-1', type: 'assign',
      data: { department: 'Ventas' },
      position: { x: 3050, y: 200 }
    },
    {
      id: 'msg-final', type: 'message',
      data: { label: '¡Listo! 🌟 Una de nuestras especialistas se comunicará contigo pronto para *confirmar tu evaluación gratuita de Hollywood Peeling*.\n\nEn ÉLAPIEL te ayudaremos a revelar la mejor versión de tu piel. ¡Hasta pronto! ✨💜' },
      position: { x: 3350, y: 200 }
    },
  ],
  edges: [
    edge('e1', 'trigger-1', 'msg-1'),
    edge('e2', 'msg-1', 'btn-1'),
    edge('e3', 'btn-1', 'msg-2'),
    edge('e4', 'msg-2', 'wait-1'),
    edge('e5', 'wait-1', 'msg-3'),
    edge('e6', 'msg-3', 'capture-1'),
    edge('e7', 'capture-1', 'capture-2'),
    edge('e8', 'capture-2', 'capture-3'),
    edge('e9', 'capture-3', 'tag-1'),
    edge('e10', 'tag-1', 'assign-1'),
    edge('e11', 'assign-1', 'msg-final'),
  ]
};

async function run() {
  console.log('🤖 Inyectando bots de ÉLAPIEL en Firestore...\n');

  const bots = [
    { key: 'depilacion-laser-4d', data: depilacionBot },
    { key: 'hifu-12d', data: hifuBot },
    { key: 'hollywood-peeling', data: hollywoodPeelingBot },
  ];

  for (const { key, data } of bots) {
    try {
      await db.collection('crm_chatbots').doc(key).set(data, { merge: true });
      console.log(`✅ Bot creado: ${data.name}`);
    } catch (e) {
      console.error(`❌ Error en ${key}:`, e);
    }
  }

  console.log('\n🎉 ¡Todos los bots inyectados correctamente!');
  process.exit(0);
}

run();
