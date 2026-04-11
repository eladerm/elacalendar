const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${VERSION}`;

export const whatsapp = {
  /**
   * Envía un mensaje de texto simple.
   */
  async sendText(to: string, body: string) {
    return this.postRequest('messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body }
    });
  },

  /**
   * Envía un mensaje basado en plantilla aprobada (necesario fuera de ventana de 24h).
   */
  async sendTemplate(to: string, templateName: string, languageCode: string = 'es', components: any[] = []) {
    return this.postRequest('messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components
      }
    });
  },

  /**
   * Envía una imagen por URL pública o por Media ID.
   */
  async sendImage(to: string, imageUrlOrId: string, caption?: string) {
    const isId = !imageUrlOrId.startsWith('http');
    return this.postRequest('messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        [isId ? 'id' : 'link']: imageUrlOrId,
        ...(caption && { caption })
      }
    });
  },

  /**
   * Marca un mensaje como leído para eliminar el badge de no-leído en el dispositivo del cliente.
   */
  async markAsRead(messageId: string) {
    return this.postRequest('messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    });
  },

  /**
   * Helper privado para peticiones POST a la Graph API de Meta usando fetch nativo.
   */
  async postRequest(endpoint: string, data: any) {
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      throw new Error('MISSING_WHATSAPP_CREDENTIALS: Define WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID en tus variables de entorno.');
    }

    const url = `${BASE_URL}/${PHONE_NUMBER_ID}/${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', result);
      throw result;
    }

    return result;
  }
};
