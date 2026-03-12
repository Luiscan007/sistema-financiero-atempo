/**
 * app/api/chat-agente/route.ts
 * Proxy para agentes IA usando Gemini Flash (gratuito)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { system, messages } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    // Diagnóstico: devolver error descriptivo si no hay key
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no encontrada. Ve a Vercel → Settings → Environment Variables y agrégala, luego redeploy.' },
        { status: 500 }
      );
    }

    // Gemini requiere al menos un mensaje "user" — proteger contra historial vacío
    const rawContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Gemini no acepta que el primer mensaje sea "model", ni dos del mismo rol seguidos
    // Filtrar y asegurar que empiece con "user"
    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const msg of rawContents) {
      const last = contents[contents.length - 1];
      if (last && last.role === msg.role) {
        // Fusionar mensajes del mismo rol
        last.parts[0].text += '\n' + msg.parts[0].text;
      } else {
        contents.push(msg);
      }
    }
    // Si empieza con model, agregar un user vacío al inicio
    if (contents.length === 0 || contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: 'Hola' }] });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: `Gemini error ${response.status}: ${err}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '...';
    return NextResponse.json({ text });

  } catch (err: any) {
    return NextResponse.json({ error: `Server error: ${err.message}` }, { status: 500 });
  }
}
