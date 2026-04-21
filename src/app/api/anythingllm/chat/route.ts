import { NextResponse } from 'next/server';

const ANYTHINGLLM_URL = process.env.ANYTHINGLLM_URL || 'http://100.99.23.106:3001';
const ANYTHINGLLM_TOKEN = process.env.ANYTHINGLLM_TOKEN || 'W6CW75G-TW2MM10-P36W9B7-B8QJNJ1';
const WORKSPACE_SLUG = process.env.ANYTHINGLLM_WORKSPACE || 'mi-espacio-de-trabajo';

export async function POST(req: Request) {
  try {
    const { message, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const payload: any = {
      message: message,
      mode: "chat"
    };

    if (sessionId) {
      payload.sessionId = sessionId;
    }

    const res = await fetch(`${ANYTHINGLLM_URL}/api/v1/workspace/${WORKSPACE_SLUG}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANYTHINGLLM_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('AnythingLLM Chat Error:', errorText);
      return NextResponse.json({ error: 'Failed to communicate with LLM' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('AnythingLLM Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
