import { NextResponse } from 'next/server';

const ANYTHINGLLM_URL = process.env.ANYTHINGLLM_URL || 'http://100.99.23.106:3001';
const ANYTHINGLLM_TOKEN = process.env.ANYTHINGLLM_TOKEN || 'W6CW75G-TW2MM10-P36W9B7-B8QJNJ1';
const WORKSPACE_SLUG = process.env.ANYTHINGLLM_WORKSPACE || 'mi-espacio-de-trabajo';

export async function POST(req: Request) {
  try {
    const { action, title, content } = await req.json();

    if (!action || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'add_document') {
      // 1. Upload raw text to AnythingLLM
      const uploadRes = await fetch(`${ANYTHINGLLM_URL}/api/v1/document/raw-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANYTHINGLLM_TOKEN}`
        },
        body: JSON.stringify({
          textContent: content,
          metadata: {
            title: title
          }
        })
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error('Error uploading doc to AnythingLLM:', errorText);
        return NextResponse.json({ error: 'Failed to upload document' }, { status: uploadRes.status });
      }

      const uploadData = await uploadRes.json();
      console.log('--- UPLOAD DATA ---', JSON.stringify(uploadData, null, 2));
      
      const documentPath = uploadData.documents?.[0]?.location || uploadData.document?.location || uploadData.documents?.[0]?.name;

      if (!documentPath) {
          console.warn('--- LOCATION NOT FOUND ---', uploadData);
          return NextResponse.json({ 
             success: true, 
             message: 'Document uploaded but location not found for embedding update.',
             data: uploadData 
          });
      }

      console.log('--- UPDATING EMBEDDINGS --- Slug:', WORKSPACE_SLUG, 'Path:', documentPath);

      // 2. Update Embeddings in the workspace
      const embedRes = await fetch(`${ANYTHINGLLM_URL}/api/v1/workspace/${WORKSPACE_SLUG}/update-embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANYTHINGLLM_TOKEN}`
        },
        body: JSON.stringify({
          adds: [documentPath],
          deletes: []
        })
      });

      if (!embedRes.ok) {
        const embedError = await embedRes.text();
        console.error('--- EMBED ERROR ---', embedError);
         return NextResponse.json({ 
             success: true, 
             warning: 'Document uploaded but failed to update embeddings.',
             errorDetail: embedError
         });
      }

      const embedData = await embedRes.json();

      return NextResponse.json({ success: true, message: 'Entrenamiento completado en AnythingLLM', embedData });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error: any) {
    console.error('AnythingLLM API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
