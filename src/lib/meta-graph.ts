const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${VERSION}`;

export const metaGraph = {
  /**
   * Envía un mensaje directo de Facebook Messenger o Instagram Directs.
   * "to" es el PSID (Facebook) o IGSID (Instagram) del recipiente.
   */
  async sendDirectMessage(to: string, text: string) {
    if (!META_PAGE_ACCESS_TOKEN) {
      console.warn("Falta META_PAGE_ACCESS_TOKEN en las variables de entorno.");
      return;
    }
    const url = `${BASE_URL}/me/messages?access_token=${META_PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: to },
        message: { text }
      })
    });
    
    const result = await response.json();
    if (!response.ok) {
        console.error('Meta Graph API Error (DMs):', result);
        throw result;
    }
    return result;
  },

  /**
   * Responde públicamente a un comentario de Facebook o Instagram.
   * commentId es provisto por el webhook de Meta.
   */
  async replyToComment(commentId: string, message: string) {
    if (!META_PAGE_ACCESS_TOKEN) {
      console.warn("Falta META_PAGE_ACCESS_TOKEN en las variables de entorno.");
      return;
    }
    const url = `${BASE_URL}/${commentId}/replies?access_token=${META_PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    const result = await response.json();
    if (!response.ok) {
        console.error('Meta Graph API Error (Comments):', result);
        throw result;
    }
    return result;
  }
};
