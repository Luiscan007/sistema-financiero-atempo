import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { system, messages, imageBase64, imageMime } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key de Groq no configurada' }, { status: 500 });
    }

    // Si hay imagen, usamos el modelo de visión, si no, el más potente de texto
    const model = imageBase64 ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: imageBase64 
          ? [
              { role: 'system', content: system },
              { 
                role: 'user', 
                content: [
                  { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
                  { type: 'text', text: messages[0].content }
                ] 
              }
            ]
          : [{ role: 'system', content: system }, ...messages],
        temperature: 0.1,
        response_format: { type: "json_object" } 
      }),
    });

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content ?? '';

    // Limpieza de emergencia: Extraer solo el objeto JSON del string
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("Error en chat-agente:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
