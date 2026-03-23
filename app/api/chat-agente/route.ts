/**
 * app/api/chat-agente/route.ts
 * Proxy para agentes IA usando Groq
 * - Texto/chat: llama-3.3-70b-versatile
 * - Imágenes: meta-llama/llama-4-scout-17b-16e-instruct
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { system, messages, imageBase64, imageMime } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY no configurada en Vercel → Settings → Environment Variables' },
        { status: 500 }
      );
    }

    const model = imageBase64
      ? 'meta-llama/llama-4-scout-17b-16e-instruct'
      : 'llama-3.3-70b-versatile';

    let groqMessages;

    if (imageBase64) {
      const lastUserMsg = messages[messages.length - 1];
      const prevMessages = messages.slice(0, -1);
      groqMessages = [
        { role: 'system', content: system },
        ...prevMessages,
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${imageMime || 'image/jpeg'};base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: lastUserMsg?.content || 'Analiza este documento',
            },
          ],
        },
      ];
    } else {
      groqMessages = [
        { role: 'system', content: system },
        ...messages,
      ];
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: 0.3, // más determinista para JSON
        messages: groqMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || JSON.stringify(data);
      return NextResponse.json(
        { error: `Groq ${response.status}: ${errMsg}` },
        { status: response.status }
      );
    }

    const text = data.choices?.[0]?.message?.content ?? '...';
    return NextResponse.json({ text });

  } catch (err: any) {
    return NextResponse.json({ error: `Server error: ${err.message}` }, { status: 500 });
  }
}
