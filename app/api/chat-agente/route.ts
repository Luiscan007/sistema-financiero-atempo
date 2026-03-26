import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { system, messages, imageBase64, imageMime } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY no configurada' },
        { status: 500 }
      );
    }

    const isVision = !!imageBase64;
    // ACTUALIZACIÓN DE MODELO: Usamos la versión estable sin "-preview"
    const model = isVision
      ? 'llama-3.2-11b-vision' 
      : 'llama-3.3-70b-versatile';

    let groqMessages;

    if (isVision) {
      const lastUserMsg = messages[messages.length - 1];
      const prevMessages = messages.slice(0, -1);
      groqMessages = [
        { role: 'system', content: system },
        ...prevMessages,
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: lastUserMsg?.content || 'Extrae los datos en JSON',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${imageMime || 'image/jpeg'};base64,${imageBase64}` },
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

    const bodyData: any = {
      model,
      max_tokens: 2048,
      temperature: 0.1,
      messages: groqMessages,
    };

    if (!isVision) {
      bodyData.response_format = { type: "json_object" };
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(bodyData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error devuelto por Groq:", data.error);
      return NextResponse.json(
        { error: `Groq API: ${data.error?.message || 'Error desconocido'}` },
        { status: response.status }
      );
    }

    let text = data.choices?.[0]?.message?.content ?? '';

    // Blindaje Anti-Rechazo
    const refusalPhrases = ["unable to analyze", "cannot analyze", "limited to", "text only", "not able to see"];
    if (refusalPhrases.some(phrase => text.toLowerCase().includes(phrase))) {
      return NextResponse.json({ 
        error: `La IA rechazó la imagen. Intenta con una captura más nítida de la tabla.`
      }, { status: 422 });
    }

    // Extracción de JSON a la fuerza
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      text = match[0];
    } else {
      return NextResponse.json({ 
        error: `La IA no generó un JSON válido. Respuesta: ${text}` 
      }, { status: 422 });
    }

    return NextResponse.json({ text });

  } catch (err: any) {
    console.error("Error catastrófico en chat-agente:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
