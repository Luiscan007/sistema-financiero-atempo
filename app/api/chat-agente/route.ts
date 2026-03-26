import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { system, messages, imageBase64, imageMime } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key de Groq no configurada' }, { status: 500 });
    }

    const isVision = !!imageBase64;
    const model = isVision ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';

    const bodyData: any = {
      model,
      messages: isVision 
        ? [
            { role: 'system', content: system },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: messages[0].content },
                { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } }
              ] 
            }
          ]
        : [{ role: 'system', content: system }, ...messages],
      temperature: 0.1,
    };

    // Solo forzamos JSON si no es visión, para evitar colapsos
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

    if (data.error) {
      console.error("Error devuelto por Groq:", data.error);
      return NextResponse.json({ error: `Groq API: ${data.error.message || 'Error desconocido'}` }, { status: 500 });
    }

    let text = data.choices?.[0]?.message?.content ?? '';

    // -- BLINDAJE ANTI-NEGATIVA DE IA --
    // Detectamos frases comunes de rechazo de imagen
    const refusalPhrases = [
      "unable to analyze",
      "cannot analyze",
      "limited to",
      "text only",
      "not able to see",
      "don't have vision"
    ];
    
    if (refusalPhrases.some(phrase => text.toLowerCase().includes(phrase))) {
      return NextResponse.json({ 
        error: `La IA rechazó esta captura de pantalla específica. A veces pasa por la calidad o filtros automáticos de Groq. Intenta tomar una nueva captura más nítida o recortada solo a la tabla de movimientos.`
      }, { status: 422 }); // Usamos 422 (Unprocessable Entity)
    }
    // -- FIN BLINDAJE --

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      text = match[0];
    } else {
      return NextResponse.json({ 
        error: `Fallo de formato. La IA leyó la imagen pero no generó datos válidos para conciliación.` 
      }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("Error catastrófico en chat-agente:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
