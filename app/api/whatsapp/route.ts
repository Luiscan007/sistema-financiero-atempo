/**
 * app/api/whatsapp/route.ts
 * Webhook WhatsApp — Twilio → Agentes IA ATEMPO
 * - Historial persistente en Firestore
 * - Contexto real: ventas, gastos, alumnos, inventario, cuentas
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// ── Firebase Admin ────────────────────────────────────────────────────────────
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

// ── Twilio ────────────────────────────────────────────────────────────────────
async function sendWhatsApp(to: string, body: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from  = process.env.TWILIO_WHATSAPP_NUMBER!;

  const chunks: string[] = [];
  for (let i = 0; i < body.length; i += 1500) {
    chunks.push(body.slice(i, i + 1500));
  }
  if (chunks.length === 0) chunks.push(body);

  for (const chunk of chunks) {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: to, Body: chunk }).toString(),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error('Twilio error:', err);
    }
  }
}

// ── Groq ──────────────────────────────────────────────────────────────────────
async function callGroq(
  system: string,
  messages: { role: string; content: string }[],
  imageBase64?: string,
  imageMime?: string
) {
  const apiKey = process.env.GROQ_API_KEY!;
  const model  = imageBase64
    ? 'meta-llama/llama-4-scout-17b-16e-instruct'
    : 'llama-3.3-70b-versatile';

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
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, max_tokens: 1024, temperature: 0.7, messages: groqMessages }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Groq ${res.status}`);
  return data.choices?.[0]?.message?.content ?? '...';
}

// ── Agentes ───────────────────────────────────────────────────────────────────
type AgentId = 'ceo' | 'fin' | 'alm' | 'cob' | 'asi' | 'gas' | 'inv' | 'pos';

const AGENTS: Record<AgentId, { name: string; role: string; emoji: string }> = {
  ceo: { name: 'Luisito', role: 'CEO',         emoji: '👑' },
  fin: { name: 'Luna',    role: 'Finanzas',     emoji: '💰' },
  alm: { name: 'Marco',   role: 'Alumnos',      emoji: '🎓' },
  cob: { name: 'Sofia',   role: 'Cobros',       emoji: '📋' },
  asi: { name: 'Héctor',  role: 'Asistencia',   emoji: '✅' },
  gas: { name: 'Ana',     role: 'Gastos',       emoji: '📊' },
  inv: { name: 'Carlos',  role: 'Inventario',   emoji: '📦' },
  pos: { name: 'Valeria', role: 'Ventas/POS',   emoji: '🛒' },
};

function detectarAgente(texto: string): AgentId {
  const t = texto.toLowerCase();
  if (t.includes('luisito') || t.includes('ceo') || t.includes('jefe') || t.includes('director') || t.includes('general')) return 'ceo';
  if (t.includes('luna') || t.includes('finanza') || t.includes('contab') || t.includes('balance')) return 'fin';
  if (t.includes('marco') || t.includes('alumno') || t.includes('estudiante') || t.includes('inscripci')) return 'alm';
  if (t.includes('sofia') || t.includes('cobr') || t.includes('deuda') || t.includes('vencid')) return 'cob';
  if (t.includes('héctor') || t.includes('hector') || t.includes('asistencia') || t.includes('presente') || t.includes('clase')) return 'asi';
  if (t.includes('ana') || t.includes('gasto') || t.includes('egreso') || t.includes('factura')) return 'gas';
  if (t.includes('carlos') || t.includes('inventario') || t.includes('stock') || t.includes('producto') || t.includes('paquete')) return 'inv';
  if (t.includes('valeria') || t.includes('venta') || t.includes('pos') || t.includes('caja') || t.includes('ingreso')) return 'pos';
  return 'ceo';
}

// ── Contexto real de Firestore ────────────────────────────────────────────────
async function obtenerContexto(db: FirebaseFirestore.Firestore): Promise<string> {
  try {
    const hoy       = new Date().toISOString().split('T')[0];
    const mesActual = hoy.substring(0, 7);

    // Ventas de hoy
    const ventasSnap = await db.collection('ventas')
      .orderBy('fechaTimestamp', 'desc').limit(100).get();
    const todasVentas = ventasSnap.docs.map(d => d.data());
    const ventasHoy   = todasVentas.filter(v => {
      const f = (v.fechaTimestamp as Timestamp)?.toDate?.()?.toISOString()?.split('T')[0];
      return f === hoy;
    });
    const totalVentasHoy = ventasHoy.reduce((a, v) => a + (v.total || 0), 0);

    // Gastos del mes
    const gastosSnap = await db.collection('gastos')
      .orderBy('fechaTimestamp', 'desc').limit(200).get();
    const gastosMes = gastosSnap.docs
      .map(d => d.data())
      .filter(g => {
        const f = (g.fechaTimestamp as Timestamp)?.toDate?.()?.toISOString()?.split('T')[0];
        return f?.startsWith(mesActual);
      });
    const totalGastosMes = gastosMes.reduce((a, g) => a + (g.montoBs || 0), 0);

    // Alumnos
    const alumnosSnap   = await db.collection('alumnos').get();
    const alumnos       = alumnosSnap.docs.map(d => d.data());
    const alumnosActivos = alumnos.filter(a => a.estado === 'activo').length;
    const conPocasClases = alumnos.filter(a =>
      a.estado === 'activo' && a.paqueteActivo?.clasesRestantes <= 2
    ).length;

    // Inventario — datos REALES
    const invSnap     = await db.collection('inventario').get();
    const productos   = invSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const stockBajo   = productos.filter(p => p.stock <= (p.stockMinimo || 0));
    const invResumen  = productos.length > 0
      ? productos.slice(0, 15).map(p =>
          `  • ${p.nombre}: stock ${p.stock} ${p.unidad || 'und'} (mín: ${p.stockMinimo || 0}) — Bs ${(p.precioBs || 0).toLocaleString('es-VE')}`
        ).join('\n')
      : '  (sin productos registrados)';

    // Cuentas vencidas
    const cuentasSnap    = await db.collection('cuentas_cobrar').get();
    const cuentasVencidas = cuentasSnap.docs.filter(d => d.data().estado === 'vencida').length;

    // Servicios/paquetes de la academia
    const serviciosSnap = await db.collection('servicios').get();
    const servicios     = serviciosSnap.docs.map(d => d.data()) as any[];
    const serviciosResumen = servicios.length > 0
      ? servicios.map(s =>
          `  • ${s.nombre}: Bs ${(s.precio || 0).toLocaleString('es-VE')}${s.clases ? ` (${s.clases} clases)` : ''}`
        ).join('\n')
      : '  (sin servicios/paquetes registrados)';

    return `📊 ESTADO ACTUAL DEL ESTUDIO ATEMPO — ${new Date().toLocaleDateString('es-VE', { weekday:'long', day:'numeric', month:'long' })}

💰 FINANZAS:
  • Ventas hoy: Bs ${totalVentasHoy.toLocaleString('es-VE')} (${ventasHoy.length} transacciones)
  • Gastos del mes: Bs ${totalGastosMes.toLocaleString('es-VE')}
  • Cuentas vencidas: ${cuentasVencidas}

🎓 ACADEMIA:
  • Alumnos activos: ${alumnosActivos}
  • Con pocas clases restantes (≤2): ${conPocasClases}

📦 INVENTARIO REAL (${productos.length} productos):
${invResumen}
${stockBajo.length > 0 ? `  ⚠ Stock bajo: ${stockBajo.map(p => p.nombre).join(', ')}` : '  ✓ Stock OK'}

🛍 PAQUETES/SERVICIOS REALES:
${serviciosResumen}

INSTRUCCIÓN CRÍTICA: Usa ÚNICAMENTE los datos anteriores. NUNCA inventes productos, paquetes, precios o datos que no aparezcan aquí. Si no tienes el dato, di "no tengo esa información en el sistema actualmente".`;
  } catch (err) {
    console.error('Error obteniendo contexto:', err);
    return '⚠ No se pudo obtener contexto del sistema. Responde solo con información que el usuario te proporcione directamente.';
  }
}

// ── Historial persistente en Firestore ───────────────────────────────────────
async function getHistorial(
  db: FirebaseFirestore.Firestore,
  phone: string
): Promise<{ role: string; content: string }[]> {
  try {
    const doc = await db.collection('whatsapp_historial').doc(phone).get();
    if (!doc.exists) return [];
    return (doc.data()?.messages || []).slice(-16);
  } catch {
    return [];
  }
}

async function saveHistorial(
  db: FirebaseFirestore.Firestore,
  phone: string,
  messages: { role: string; content: string }[]
) {
  try {
    await db.collection('whatsapp_historial').doc(phone).set({
      messages: messages.slice(-20),
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    console.error('Error guardando historial:', err);
  }
}

// ── System prompt por agente ──────────────────────────────────────────────────
function buildPrompt(agentId: AgentId, contexto: string): string {
  const agent = AGENTS[agentId];
  const base  = `Eres ${agent.name}, agente de ${agent.role} del Estudio ATEMPO en Venezuela.
Respondes por WhatsApp al dueño del estudio. Sé conciso (máximo 4 oraciones), directo y profesional.
Usa emojis con moderación. Responde siempre en español venezolano.

${contexto}

⚠ REGLA ABSOLUTA: Solo menciona productos, paquetes, precios y datos que estén en el contexto de arriba. Si no están listados, di "no tengo esa información registrada en el sistema".`;

  const roles: Record<AgentId, string> = {
    ceo: 'Como CEO, das visión estratégica del negocio completo. Coordinas con tu equipo.',
    fin: 'Te especializas en finanzas, contabilidad y flujo de caja del estudio.',
    alm: 'Te especializas en gestión de alumnos, inscripciones y seguimiento académico.',
    cob: 'Te especializas en cuentas por cobrar, deudas y gestión de pagos pendientes.',
    asi: 'Te especializas en control de asistencia y seguimiento de clases.',
    gas: 'Te especializas en gastos y egresos del estudio.',
    inv: 'Te especializas en inventario. Solo mencionas productos que aparecen en el listado de inventario real del sistema.',
    pos: 'Te especializas en ventas y punto de venta. Solo mencionas precios y paquetes que aparecen en el sistema.',
  };

  return `${base}\n\nTU ROL ESPECÍFICO: ${roles[agentId]}`;
}

// ── Descargar imagen de Twilio ────────────────────────────────────────────────
async function downloadImageBase64(mediaUrl: string): Promise<{ base64: string; mime: string }> {
  const sid   = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;

  const res = await fetch(mediaUrl, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
    },
  });
  const mime   = res.headers.get('content-type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return { base64, mime };
}

// ── WEBHOOK PRINCIPAL ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body    = await req.text();
    const params  = new URLSearchParams(body);

    const from      = params.get('From') || '';
    const msgBody   = params.get('Body') || '';
    const numMedia  = parseInt(params.get('NumMedia') || '0');
    const mediaUrl  = params.get('MediaUrl0') || '';
    const mediaMime = params.get('MediaContentType0') || '';

    // Verificar que es el dueño
    const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;
    if (ownerNumber && from !== ownerNumber) {
      return new NextResponse('<?xml version="1.0"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const db = getAdminDb();

    // Obtener contexto real + historial en paralelo
    const [contexto, historial] = await Promise.all([
      obtenerContexto(db),
      getHistorial(db, from),
    ]);

    // Detectar agente
    const agentId = detectarAgente(msgBody);
    const agent   = AGENTS[agentId];
    const system  = buildPrompt(agentId, contexto);

    // Agregar mensaje al historial
    historial.push({ role: 'user', content: msgBody || '[imagen/archivo]' });

    let respuesta: string;

    if (numMedia > 0 && mediaUrl) {
      const esImagen = mediaMime.startsWith('image/');
      if (esImagen) {
        const { base64, mime } = await downloadImageBase64(mediaUrl);
        respuesta = await callGroq(
          system + '\nEl usuario envió una imagen. Analízala en el contexto del estudio.',
          [{ role: 'user', content: msgBody || 'Analiza esta imagen' }],
          base64,
          mime
        );
      } else {
        respuesta = `${agent.emoji} *${agent.name}*: Solo puedo procesar imágenes por ahora. Envía la factura como foto y la analizo.`;
      }
    } else {
      respuesta = await callGroq(system, historial.slice(-12));
    }

    // Guardar respuesta en historial y persistir
    historial.push({ role: 'assistant', content: respuesta });
    await saveHistorial(db, from, historial);

    // Formatear y enviar
    const respuestaFormateada = `${agent.emoji} *${agent.name} — ${agent.role}*\n\n${respuesta}`;
    await sendWhatsApp(from, respuestaFormateada);

    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    console.error('WhatsApp webhook error:', err);
    // Intentar enviar error al usuario
    try {
      const body   = await req.text().catch(() => '');
      const params = new URLSearchParams(body);
      const from   = params.get('From') || '';
      if (from) {
        await sendWhatsApp(from, `⚠ Error interno: ${err.message}. Por favor intenta de nuevo.`);
      }
    } catch {}
    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

export async function GET() {
  return new NextResponse('ATEMPO WhatsApp Webhook OK', { status: 200 });
}
