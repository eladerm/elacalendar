# 📖 Manual de Operación: Motor Híbrido Élapiel

Bienvenido a la guía definitiva para configurar y entender la arquitectura conversacional del CRM Inteligente de Élapiel. Este documento explica cómo conviven los bots visuales (reglas), la asistente de Inteligencia Artificial (Ela) y la atención manual humana.

---

## 1. El Concepto de "Doble Cerebro" (Motor Híbrido)

Tu sistema WhatsApp está conectado a un algoritmo en cascada. Cuando un cliente te escribe, el sistema se hace las siguientes preguntas en orden de prioridad:

1. **¿El bot está en "Modo Pausado"?**
   - *Si SÍ:* Ignora toda automatización y espera a que un humano responda desde la pantalla de *Chat del CRM*.
   - *Si NO:* Pasa a la siguiente regla.

2. **¿El usuario activó una palabra mágica (Gatillo) o está atrapado en un menú de botones?**
   - *Si SÍ:* Ejecuta el **Modo Estructurado (Cajas)** y va saltando nodo por nodo.
   - *Si NO:* Pasa a la siguiente regla.

3. **Inteligencia Artificial Activa (Salvavidas):**
   - Como no se detonó ningún flujo estricto, el mensaje llega a **"Ela" (Genkit/Gemini)**. Ela leerá el historial de la conversación, buscará información en las notas institucionales (Precios, Sedes, Servicios) y responderá fluidamente buscando persuadir al paciente y concretar la cita.

---

## 2. Automatizaciones (Chatbots Visuales por Cajas)

En el menú `Automatización > Chatbots`, puedes diseñar flujos estrictos (árboles de decisión). Son ideales para menús, encuestas de satisfacción, o flujos donde no quieres que la Inteligencia Artificial improvise (ej: promociones específicas).

### 🛠️ ¿Cómo Configurar un Flujo Visual?
- **Crear Flujo:** Ingresa al panel, dale un nombre y activa el switch superior ("Bot Activo").
- **Gatillo Inicial:** Escribe en la caja de Gatillo la palabra clave exacta (Ej: `Palabra: info`). Cuando un cliente escriba "info", se secuestrará la conversación de Ela y se iniciará este flujo cerrado.
- **Opción (Menús):** Si usas la caja "Opciones", escribe las alternativas. ¡El sistema **se pausará** automáticamente en este nodo esperando que el usuario escriba la respuesta antes de continuar el flujo!
- *El Flujo termina cuando ya no hay más flechas conectadas.* El sistema liberará de nuevo al paciente para que Ela (IA) o un Agente humano retomen el control.

---

## 3. Asistente Inteligente "Ela" (IA)

En el menú `Automatización > Asistentes IA`, configuras el "Alma" del chatbot conversacional fluido.

### 🛠️ ¿Cómo Configurar a Ela?
- El **System Prompt (Reglas de Personalidad)** es la caja grande de texto central. Allí le dices cómo hablar. Ej: *"Eres experta, nunca des el precio directo, sé amable"*.
- **Inyección de Conocimiento (RAG):** Puedes cargar pequeños documentos o "Notas" con información actualizada al asistente. Por ejemplo, si cambiaste de proveedor de toxina botulínica o hay descuentos de verano, basta con añadir una nota y Ela utilizará ese conocimiento inyectado para responder sin inventar información.

---

## 4. Control de Tormenta: Toma de Control Manual

Incluso con el mejor de los motores, hay pacientes que requieren el toque directo de la doctora o asesora de la clínica.

### 🛠️ Pausando el Cerebro:
1. En el módulo de `Chat`, verás la conversación entrando en tiempo real.
2. Si ves que el bot estricto o Ela no están llevando la conversación por dónde quieres, haz clic en **"Pausar Bot / Transferir"**.
3. Un candado verde cambiará a naranja ("BOT PAUSADO"). *Desde este segundo*, el CRM bloquea los Webhooks de WhatsApp por lo que ningún mensaje futuro del paciente enviará respuestas automáticas. ¡Es todo tuyo!
4. Cuando termines, presiona el botón naranja **"Reactivar Bot"** para devolverle la gestión a Ela.

---

## 5. El Embudo de Ventas (El Corazón del Cierre)

Finalmente, todo paciente que gotee de la Inteligencia Artificial o al que le hables manualmente, existirá como una "Tarjeta Magnética".

- **Arrastrar Cajas:** Entra en `Embudos`. Puedes arrastrar con el mouse cualquier tarjeta de una columna a la otra para saber en qué estatus están tus pacientes ("Cotizado", "A Punto de Firmar", "Tratamiento Cobrado").
- **Añadir Manual:** Si conseguiste a alguien por otra vía (ej: te llamaron por voz o los viste en la calle) haz clic en `Añadir Manual` en cualquier fase de tu embudo para meter un registro local a la vida del CRM sin que exista chat de WhatsApp.

¡Eso es todo! Combinando Reglas estrictas para procesos cuadrados (encuestas/menús fijos), IA para venta fluida persuasiva, y pausa manual cuando intervenga gerencia, tu clínica se vuelve un reloj suizo.
