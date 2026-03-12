/**
 * app/api/chat-agente/route.ts
 * Proxy para agentes IA usando Gemini 2.0 Flash
 */

import { NextRequest, NextResponse } from 'next/server';

const MODEL = 'gemini-2.0-flash';

export async function POST(req: NextRequest) {
  try {
    const { system, messages } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no configurada en Vercel → Settings → Environment Variables' },
        { status: 500 }
      );
    }

    // Convertir historial al formato Gemini
    // Gemini no acepta mensajes consecutivos del mismo rol
    const rawContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const msg of rawContents) {
      const last = contents[contents.length - 1];
      if (last && last.role === msg.role) {
        last.parts[0].text += '\n' + msg.parts[0].text;
      } else {
        contents.push(msg);
      }
    }
    if (contents.length === 0 || contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: 'Hola' }] });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || JSON.stringify(data);
      return NextResponse.json(
        { error: `Gemini ${response.status}: ${errMsg}` },
        { status: response.status }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '...';
    return NextResponse.json({ text });

  } catch (err: any) {
    return NextResponse.json({ error: `Server error: ${err.message}` }, { status: 500 });
  }
}
