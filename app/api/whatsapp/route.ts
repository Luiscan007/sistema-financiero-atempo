/**
 * app/api/whatsapp/route.ts
 *
 * Webhook de WhatsApp vía Twilio.
 * Recibe mensajes del dueño, los enruta al agente IA correcto y responde.
 *
 * Variables de entorno necesarias en Vercel:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_NUMBER   (ej: whatsapp:+14155238886)
 *   OWNER_WHATSAPP_NUMBER    (ej: whatsapp:+584121234567)
 *   GROQ_API_KEY
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Firebase Admin (para leer ventas/gastos en el webhook) ──────────────────
function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

// ── Twilio helper ────────────────────────────────────────────────────────────
async function sendWhatsApp(to: string, body: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from  = process.env.TWILIO_WHATSAPP_NUMBER!;

  // Twilio limita mensajes a 1600 caracteres
  // Dividir en chunks de 1500 chars sin usar flag 's'
  const chunks: string[] = [];
  for (let i = 0; i < body.length; i += 1500) {
    chunks.push(body.slice(i, i + 1500));
  }
  if (chunks.length === 0) chunks.push(body);

  for (const chunk of chunks) {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: chunk }).toString(),
    });
  }
}

// ── Groq ─────────────────────────────────────────────────────────────────────
async function callGroq(system: string, messages: { role: string; content: string }[], imageBase64?: string, imageMime?: string) {
  const apiKey = process.env.GROQ_API_KEY!;
  const model  = imageBase64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

  const groqMessages = imageBase64
    ? [
        { role: 'system', content: system },
        ...messages.slice(0, -1),
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
            { type: 'text', text: messages[messages.length - 1]?.content || 'Analiza este documento' },
          ],
        },
      ]
    : [{ role: 'system', content: system }, ...messages];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 1024, temperature: 0.7, messages: groqMessages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Groq error');
  return data.choices?.[0]?.message?.content ?? '...';
}

// ── Detectar agente según el mensaje ─────────────────────────────────────────
type AgentId = 'ceo' | 'fin' | 'alm' | 'cob' | 'asi' | 'gas' | 'inv' | 'pos';

const AGENTS: Record<AgentId, { name: string; role: string; emoji: string }> = {
  ceo:  { name: 'Víctor',  role: 'CEO',         emoji: '👑' },
  fin:  { name: 'Luna',    role: 'Finanzas',     emoji: '💰' },
  alm:  { name: 'Marco',   role: 'Alumnos',      emoji: '🎓' },
  cob:  { name: 'Sofia',   role: 'Cobros',       emoji: '📋' },
  asi:  { name: 'Diego',   role: 'Asistencia',   emoji: '✅' },
  gas:  { name: 'Ana',     role: 'Gastos',       emoji: '📊' },
  inv:  { name: 'Carlos',  role: 'Inventario',   emoji: '📦' },
  pos:  { name: 'Valeria', role: 'Ventas/POS',   emoji: '🛒' },
};

function detectarAgente(texto: string): AgentId {
  const t = texto.toLowerCase();
  if (t.includes('víctor') || t.includes('victor') || t.includes('ceo') || t.includes('jefe') || t.includes('director')) return 'ceo';
  if (t.includes('luna') || t.includes('finanza') || t.includes('contab') || t.includes('balance')) return 'fin';
  if (t.includes('marco') || t.includes('alumno') || t.includes('estudiante') || t.includes('inscripci')) return 'alm';
  if (t.includes('sofia') || t.includes('cobr') || t.includes('deuda') || t.includes('vencid') || t.includes('pagar')) return 'cob';
  if (t.includes('diego') || t.includes('asistencia') || t.includes('presente') || t.includes('clase')) return 'asi';
  if (t.includes('ana') || t.includes('gasto') || t.includes('egreso') || t.includes('factura')) return 'gas';
  if (t.includes('carlos') || t.includes('inventario') || t.includes('stock') || t.includes('producto')) return 'inv';
  if (t.includes('valeria') || t.includes('venta') || t.includes('pos') || t.includes('caja') || t.includes('ingreso')) return 'pos';
  // Por defecto el CEO responde preguntas generales
  return 'ceo';
}

// ── Obtener contexto real de Firestore ────────────────────────────────────────
async function obtenerContexto(): Promise<string> {
  try {
    const db = getAdminDb();
    const hoy = new Date().toISOString().split('T')[0];

    // Ventas de hoy
    const ventasSnap = await db.collection('ventas')
      .orderBy('fechaTimestamp', 'desc')
      .limit(50)
      .get();
    const ventas = ventasSnap.docs.map(d => d.data());
    const ventasHoy = ventas.filter(v => {
      const f = v.fechaTimestamp?.toDate?.()?.toISOString()?.split('T')[0];
      return f === hoy;
    });
    const totalVentasHoy = ventasHoy.reduce((a: number, v: any) => a + (v.total || 0), 0);

    // Gastos del mes
    const mesActual = hoy.substring(0, 7);
    const gastosSnap = await db.collection('gastos')
      .orderBy('fechaTimestamp', 'desc')
      .limit(100)
      .get();
    const gastos = gastosSnap.docs.map(d => d.data());
    const gastosMes = gastos.filter((g: any) => {
      const f = g.fechaTimestamp?.toDate?.()?.toISOString()?.split('T')[0];
      return f?.startsWith(mesActual);
    });
    const totalGastosMes = gastosMes.reduce((a: number, g: any) => a + (g.montoBs || 0), 0);

    // Alumnos
    const alumnosSnap = await db.collection('alumnos').get();
    const alumnos = alumnosSnap.docs.map(d => d.data());
    const alumnosActivos = alumnos.filter((a: any) => a.estado === 'activo').length;
    const conPocasClases = alumnos.filter((a: any) =>
      a.estado === 'activo' && a.paqueteActivo?.clasesRestantes <= 2
    ).length;

    // Cuentas vencidas
    const cuentasSnap = await db.collection('cuentas_cobrar').get();
    const cuentasVencidas = cuentasSnap.docs.filter(d => d.data().estado === 'vencida').length;

    return `📊 ESTADO ACTUAL DEL ESTUDIO ATEMPO (${new Date().toLocaleDateString('es-VE')}):
- 💰 Ventas hoy: Bs ${totalVentasHoy.toLocaleString('es-VE')} (${ventasHoy.length} transacciones)
- 📊 Gastos del mes: Bs ${totalGastosMes.toLocaleString('es-VE')}
- 🎓 Alumnos activos: ${alumnosActivos} (${conPocasClases} con pocas clases restantes)
- 📋 Cuentas vencidas: ${cuentasVencidas}`;
  } catch {
    return '(contexto de datos no disponible en este momento)';
  }
}

// ── Construir system prompt por agente ────────────────────────────────────────
function buildPrompt(agentId: AgentId, contexto: string): string {
  const agent = AGENTS[agentId];
  const base = `Eres ${agent.name}, agente de ${agent.role} del Estudio ATEMPO en Venezuela.
Estás respondiendo por WhatsApp al dueño del estudio. Sé conciso (máximo 3-4 oraciones), directo y profesional.
Usa emojis con moderación. Responde siempre en español.

${contexto}`;

  if (agentId === 'ceo') return base + `\nComo CEO, das visión estratégica consolidada. Puedes coordinar con tu equipo: Luna (Finanzas), Marco (Alumnos), Sofia (Cobros), Diego (Asistencia), Ana (Gastos), Carlos (Inventario), Valeria (Ventas).`;
  if (agentId === 'fin') return base + `\nTe especializas en finanzas, contabilidad y análisis de estados financieros del estudio.`;
  if (agentId === 'alm') return base + `\nTe especializas en gestión de alumnos, inscripciones, paquetes de clases y seguimiento académico.`;
  if (agentId === 'cob') return base + `\nTe especializas en cuentas por cobrar, deudas pendientes y gestión de pagos.`;
  if (agentId === 'asi') return base + `\nTe especializas en asistencia de alumnos y control de clases.`;
  if (agentId === 'gas') return base + `\nTe especializas en gastos, egresos y análisis de costos del estudio.`;
  if (agentId === 'inv') return base + `\nTe especializas en inventario, stock de productos y alertas de reabastecimiento.`;
  if (agentId === 'pos') return base + `\nTe especializas en ventas, punto de venta y métodos de pago.`;
  return base;
}

// ── Descargar imagen de Twilio en base64 ─────────────────────────────────────
async function downloadImageBase64(mediaUrl: string): Promise<{ base64: string; mime: string }> {
  const sid   = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;

  const res = await fetch(mediaUrl, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
    },
  });
  const mime = res.headers.get('content-type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return { base64, mime };
}

// ── Historial en memoria (por número de teléfono) ────────────────────────────
const historial = new Map<string, { role: string; content: string }[]>();

function getHistorial(phone: string) {
  if (!historial.has(phone)) historial.set(phone, []);
  return historial.get(phone)!;
}

function addHistorial(phone: string, role: string, content: string) {
  const h = getHistorial(phone);
  h.push({ role, content });
  // Mantener últimos 20 mensajes
  if (h.length > 20) h.splice(0, h.length - 20);
}

// ── WEBHOOK PRINCIPAL ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const from        = params.get('From') || '';
    const msgBody     = params.get('Body') || '';
    const numMedia    = parseInt(params.get('NumMedia') || '0');
    const mediaUrl    = params.get('MediaUrl0') || '';
    const mediaMime   = params.get('MediaContentType0') || '';

    // Verificar que es el dueño
    const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;
    if (ownerNumber && from !== ownerNumber) {
      return new NextResponse('<?xml version="1.0"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Obtener contexto del sistema
    const contexto = await obtenerContexto();

    // Detectar agente
    const agentId  = detectarAgente(msgBody);
    const agent    = AGENTS[agentId];
    const system   = buildPrompt(agentId, contexto);

    // Agregar al historial
    addHistorial(from, 'user', msgBody || '[imagen/archivo]');
    const msgs = getHistorial(from).slice(-10);

    let respuesta: string;

    if (numMedia > 0 && mediaUrl) {
      // Hay imagen adjunta
      const esImagen = mediaMime.startsWith('image/');
      if (esImagen) {
        const { base64, mime } = await downloadImageBase64(mediaUrl);
        respuesta = await callGroq(
          system + '\nEl usuario te envió una imagen. Analízala en el contexto del estudio ATEMPO.',
          [{ role: 'user', content: msgBody || 'Analiza esta imagen' }],
          base64,
          mime
        );
      } else {
        respuesta = `${agent.emoji} *${agent.name}*: Recibí tu archivo. Por ahora solo puedo procesar imágenes. Si es una factura, envíala como foto y la analizo.`;
      }
    } else {
      respuesta = await callGroq(system, msgs);
    }

    // Formatear respuesta con firma del agente
    const respuestaFormateada = `${agent.emoji} *${agent.name} — ${agent.role}*\n\n${respuesta}`;
    addHistorial(from, 'assistant', respuesta);

    // Enviar respuesta por WhatsApp
    await sendWhatsApp(from, respuestaFormateada);

    // Responder a Twilio (vacío para evitar doble mensaje)
    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    console.error('WhatsApp webhook error:', err);
    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

// Twilio verifica el webhook con GET
export async function GET() {
  return new NextResponse('ATEMPO WhatsApp Webhook OK', { status: 200 });
}
