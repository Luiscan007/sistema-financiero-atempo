import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'El destinatario y el mensaje son requeridos.' },
        { status: 400 }
      );
    }

    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+584241785256';

    if (!sid || !token) {
      return NextResponse.json(
        { error: 'Las credenciales de Twilio no están configuradas en el servidor.' },
        { status: 500 }
      );
    }

    // Limpiar el número de teléfono (dejar solo dígitos y signo más)
    let cleanTo = to.replace(/[^\d+]/g, '');

    // Formatear si no tiene el prefijo de país +58 (asumiendo Venezuela si tiene 10 u 11 dígitos)
    if (!cleanTo.startsWith('+')) {
      if (cleanTo.startsWith('0')) {
        cleanTo = '+58' + cleanTo.slice(1);
      } else if (cleanTo.startsWith('58')) {
        cleanTo = '+' + cleanTo;
      } else {
        cleanTo = '+58' + cleanTo;
      }
    }

    // Twilio requiere el formato 'whatsapp:+XXXXX'
    const formattedTo = cleanTo.startsWith('whatsapp:') ? cleanTo : `whatsapp:${cleanTo}`;
    const formattedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

    // Enviar mensaje mediante la API de Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: formattedFrom,
        To: formattedTo,
        Body: message,
      }).toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error de respuesta de Twilio:', errText);
      return NextResponse.json(
        { error: `Error de Twilio: ${res.statusText}`, details: errText },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, messageId: data.sid });

  } catch (error: any) {
    console.error('Error enviando recibo por WhatsApp:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
