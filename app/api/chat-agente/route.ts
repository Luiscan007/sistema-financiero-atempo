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

    // OJO: Al modelo de visión le quitamos el response_format porque a veces lo hace crashear
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

    // Si Groq nos rechaza la petición, capturamos el error real
    if (data.error) {
      console.error("Error devuelto por Groq:", data.error);
      return NextResponse.json({ error: `Groq API: ${data.error.message || 'Error desconocido'}` }, { status: 500 });
    }

    let text = data.choices?.[0]?.message?.content ?? '';

    // Extracción hardcore: Buscamos el primer '{' y el último '}' sin importar qué más haya escrito la IA
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      text = match[0];
    } else {
      // Si de verdad no hay JSON, devolvemos el texto puro para ver qué rayos dijo la IA
      return NextResponse.json({ error: `La IA no generó un JSON. Respondió: ${text}` }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("Error catastrófico en chat-agente:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}     : [{ role: 'system', content: system }, ...messages],
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
