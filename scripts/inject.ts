import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function run() {
  try {
    const app = initializeApp({ projectId: 'studio-3620711772-b2859' });
    const db = getFirestore(app);

    const sources = [
      {
        id: crypto.randomUUID(),
        name: 'Despigmentación con láser',
        type: 'text',
        content: `Usar esta respuesta cuando el cliente pregunte por Despigmentación de zonas.

✨ Tratamiento de Despigmentación con Láser para aclarar y unificar el tono de la piel de forma progresiva y segura.

Mejora el tono, textura y apariencia sin procedimientos invasivos.

Incluye evaluación gratuita.

¿Te gustaría agendar tu valoración sin costo?

Si el cliente pregunta específicamente por el precio, responder únicamente con:

✨ Para brindarte el mejor resultado, es fundamental realizar una evaluación donde analizamos el grado y tipo de pigmentación. De esta manera podemos diseñar un tratamiento personalizado para ti. La valoración es totalmente gratuita.

Contamos con promociones vigentes que se explican en la cita.

¿Te gustaría reservar tu evaluación totalmente gratis?`,
        status: 'ready'
      },
      {
        id: crypto.randomUUID(),
        name: 'Rejuvenecimiento facial con laser',
        type: 'text',
        content: `Usar esta respuesta cuando el cliente pregunte por Rejuvenecimiento Facial con Láser (Hollywood Peeling) o su precio.

🔹 Si el cliente solicita información:

✨ La Exfoliación Facial con Láser estimula la producción de colágeno, mejora la textura, luminosidad y ayuda a atenuar líneas de expresión.

✓ Mejora poros abiertos
✓ Unifica el tono
✓ Apoya en procesos de despigmentación

Es un tratamiento no invasivo y seguro.

🎁 Incluye limpieza facial gratuita.

Incluye evaluación sin costo.

¿Te gustaría agendar tu valoración?

🔹 Si el cliente solicita precio:

✨ Para brindarte la mejor asesoría y precio según lo que tu piel necesite, contamos con una evaluación gratuita sin compromiso.

¿Te reservo tu cupo para la evaluación?`,
        status: 'ready'
      },
      {
         id: crypto.randomUUID(),
         name: 'HIFU - Informacion',
         type: 'text',
         content: `Usar esta respuesta cuando el cliente pregunte por HIFU 12D o su precio.

🔹 Si el cliente solicita información:

✨ HIFU 12D es un tratamiento de ultrasonido focalizado que reafirma y redefine el rostro sin cirugía.

Ideal para:

✓ Lifting facial sin cirugía
✓ Efecto bichectomía sin cirugía
✓ Reducción de papada
✓ Mejora de flacidez

El tratamiento se personaliza según el grado de flacidez y características de tu piel.

🎁 Al realizarte HIFU 12D obsequiamos una limpieza facial.

Incluye evaluación gratuita.

¿Te gustaría agendar tu valoración?

🔹 Si el cliente solicita precio:

✨ Para brindarte la mejor asesoría y un valor exacto según el grado de flacidez, primero la especialista debe evaluarte de forma gratuita.

¿Te reservo tu cupo para la evaluación?`,
         status: 'ready'
      },
      {
        id: crypto.randomUUID(),
        name: 'DEPILACION LASER 4D',
        type: 'text',
        content: `Actúa como asesora comercial experta en Depilación Láser 4D de ÉLAPIEL.

Tu objetivo principal es llevar la conversación hacia la reserva de la evaluación gratuita, evitando entregar toda la información económica desde el inicio.

Antes de responder, verifica que no exista otra fuente activa que hable específicamente sobre promociones de depilación láser.
Si existe otra fuente promocional activa, no intervenir.
Si no existe, continuar con este flujo.

Todas las respuestas deben usar Formato de texto enriquecido (Markdown de WhatsApp):

Texto limpio y ordenado
Espacios entre bloques
Uso moderado de emojis
Uso de ✓ cuando sea necesario
No enviar textos largos sin separación`,
        status: 'ready'
      },
      {
        id: crypto.randomUUID(),
        name: 'Promociones vigentes',
        type: 'text',
        content: `DEPILACIÓN LÁSER 4D
Eliminación progresiva del vello con tecnología avanzada.
Depende del tipo de folículo y zona tratada.
Incluye demostración gratuita en la zona de interés según campaña.
Sesiones gratis con la promocion vigente

HIFU 12D
Tratamiento de ultrasonido focalizado para lifting facial sin cirugía.
Mejora firmeza, redefine el óvalo facial y reduce flacidez.
No despigmenta.
Incluye limpieza facial de obsequio.
Bichectomía sin cirugía
Lipopapada sin cirugía

REJUVENECIMIENTO FACIAL CON LÁSER
(Hollywood Peeling)
Tratamiento láser que estimula colágeno, mejora textura, luminosidad y ayuda a despigmentar.
Atenúa líneas de expresión superficiales.
Incluye limpieza facial gratuita.

LIMPIEZA FACIAL CON HIDRATACIÓN DE COLÁGENO
Protocolo de limpieza profunda e hidratación personalizada según tipo de piel.`,
        status: 'ready'
      }
    ];

    // Get the active assistant
    const snapshot = await db.collection('crm_ai_assistants').where('active', '==', true).limit(1).get();
    
    if (snapshot.empty) {
        console.log('No active AI assistant found. Adding sources to a new assistant document...');
        await db.collection('crm_ai_assistants').add({
           name: 'Ela (Reservas y Consultas)',
           active: true,
           tone: 'amistoso',
           responseLength: 'corta',
           language: 'es',
           responseDelay: 3,
           systemPrompt: '',
           guidelines: [],
           sources: sources,
           createdAt: new Date(),
           updatedAt: new Date()
        });
        console.log('New assistant created with sources!');
    } else {
        const docId = snapshot.docs[0].id;
        const currentData = snapshot.docs[0].data();
        let existingSources = currentData.sources || [];
        existingSources = [...existingSources, ...sources];
        
        await db.collection('crm_ai_assistants').doc(docId).update({
            sources: existingSources,
            updatedAt: new Date()
        });
        console.log('Sources added to existing active assistant!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
