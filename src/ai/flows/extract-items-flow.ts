'use server';
/**
 * @fileOverview Agente para extraer nombres de productos desde imágenes.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractItemsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Una foto de una lista de productos, como data URI. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const ExtractItemsOutputSchema = z.object({
  items: z.array(z.string()).describe('Lista de nombres de productos extraídos en mayúsculas.'),
});

export async function extractItemsFromImage(input: { photoDataUri: string }): Promise<string[]> {
  const { output } = await ai.generate({
    prompt: [
      { text: "Eres un asistente de inventario. Extrae todos los nombres de productos o insumos de esta imagen. Omite precios, cantidades o códigos de barra. Devuelve solo los nombres de los productos en un listado limpio, todo en MAYÚSCULAS." },
      { media: { url: input.photoDataUri } }
    ],
    output: { schema: ExtractItemsOutputSchema }
  });

  return output?.items || [];
}
