'use client';

/**
 * app/whatsapp/page.tsx
 * Panel de configuración y estado del sistema WhatsApp ↔ Agentes IA
 */

import { useState } from 'react';
import { MessageSquare, CheckCircle2, Copy, ExternalLink, Smartphone, Bot, Zap, Shield } from 'lucide-react';

export default function WhatsAppPage() {
  const [copiado, setCopiado] = useState('');

  const copiar = (texto: string, key: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(key);
    setTimeout(() => setCopiado(''), 2000);
  };

  const webhookUrl = 'https://sistema-financiero-atempo.vercel.app/api/whatsapp';

  const AGENTES = [
    { emoji: '👑', name: 'Luisito (CEO)',   keywords: ['luisito', 'ceo', 'jefe', 'director', 'general'],        color: '#F59E0B' },
    { emoji: '💰', name: 'Luna',           keywords: ['luna', 'finanzas', 'contabilidad', 'balance'],          color: '#EF4444' },
    { emoji: '🎓', name: 'Marco',          keywords: ['marco', 'alumnos', 'estudiantes', 'inscripción'],       color: '#818CF8' },
    { emoji: '📋', name: 'Sofia',          keywords: ['sofia', 'cobros', 'deudas', 'vencidas'],                color: '#34D399' },
    { emoji: '✅', name: 'Héctor',          keywords: ['héctor', 'asistencia', 'presentes', 'clases'],           color: '#F472B6' },
    { emoji: '📊', name: 'Ana',            keywords: ['ana', 'gastos', 'egresos', 'facturas'],                 color: '#FBBF24' },
    { emoji: '📦', name: 'Carlos',         keywords: ['carlos', 'inventario', 'stock', 'productos'],           color: '#38BDF8' },
    { emoji: '🛒', name: 'Valeria',        keywords: ['valeria', 'ventas', 'pos', 'caja'],                    color: '#FB923C' },
  ];

  const PASOS = [
    {
      num: '1',
      titulo: 'Crear cuenta en Twilio',
      desc: 'Ve a twilio.com y crea una cuenta gratuita. No necesitas tarjeta para el sandbox de WhatsApp.',
      link: 'https://twilio.com',
      linkLabel: 'Ir a Twilio →',
    },
    {
      num: '2',
      titulo: 'Activar WhatsApp Sandbox',
      desc: 'En Twilio Console → Messaging → Try it out → Send a WhatsApp message. Sigue las instrucciones para activar el sandbox con tu número.',
      link: 'https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn',
      linkLabel: 'Abrir sandbox →',
    },
    {
      num: '3',
      titulo: 'Configurar el webhook',
      desc: 'En Twilio Console → Messaging → Settings → WhatsApp Sandbox Settings. En "When a message comes in" pega esta URL:',
      webhook: webhookUrl,
    },
    {
      num: '4',
      titulo: 'Agregar variables en Vercel',
      desc: 'Ve a tu proyecto en Vercel → Settings → Environment Variables y agrega estas 5 variables:',
      vars: [
        { key: 'TWILIO_ACCOUNT_SID',       hint: 'Tu Account SID de Twilio Console' },
        { key: 'TWILIO_AUTH_TOKEN',         hint: 'Tu Auth Token de Twilio Console' },
        { key: 'TWILIO_WHATSAPP_NUMBER',    hint: 'ej: whatsapp:+14155238886' },
        { key: 'OWNER_WHATSAPP_NUMBER',     hint: 'Tu número: whatsapp:+584121234567' },
        { key: 'FIREBASE_PROJECT_ID',       hint: 'ID de tu proyecto Firebase' },
        { key: 'FIREBASE_CLIENT_EMAIL',     hint: 'Email de tu service account Firebase' },
        { key: 'FIREBASE_PRIVATE_KEY',      hint: 'Clave privada de tu service account Firebase' },
      ],
    },
    {
      num: '5',
      titulo: 'Redeploy y listo',
      desc: 'Haz redeploy en Vercel. Escríbele al número de Twilio desde WhatsApp y los agentes responderán automáticamente.',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-green-400" />
          WhatsApp → Agentes IA
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Consulta a tus agentes y envía documentos directamente desde WhatsApp
        </p>
      </div>

      {/* Cómo funciona */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Smartphone, title: 'Tú escribes',    desc: 'Envías un mensaje o foto desde WhatsApp al número de Twilio', color: 'text-blue-400' },
          { icon: Zap,        title: 'IA procesa',     desc: 'El sistema detecta qué agente debe responder según el contexto', color: 'text-yellow-400' },
          { icon: Bot,        title: 'Agente responde',desc: 'El agente consulta datos reales del sistema y te responde en segundos', color: 'text-green-400' },
        ].map(item => (
          <div key={item.title} className="card-sistema p-4 flex gap-3">
            <item.icon className={`w-8 h-8 ${item.color} shrink-0`} />
            <div>
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Agentes y sus palabras clave */}
      <div className="card-sistema p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          Agentes disponibles — palabras clave para invocarlos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {AGENTES.map(a => (
            <div key={a.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
              <span className="text-xl">{a.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: a.color }}>{a.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {a.keywords.map(k => (
                    <span key={k} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{k}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          💡 Si ninguna palabra clave coincide, Luisito (CEO) responde con visión general del negocio.
          También puedes enviar imágenes de facturas o documentos — el agente las analizará automáticamente.
        </p>
      </div>

      {/* Ejemplos de uso */}
      <div className="card-sistema p-5">
        <h2 className="font-semibold mb-3">Ejemplos de mensajes</h2>
        <div className="space-y-2">
          {[
            { msg: 'Luna, ¿cuánto vendimos hoy?',               agente: '💰 Luna responde con ventas del día' },
            { msg: 'Marco, ¿cuántos alumnos activos tenemos?',   agente: '🎓 Marco responde con datos de alumnos' },
            { msg: 'Sofia, ¿hay cuentas vencidas?',              agente: '📋 Sofia revisa cuentas por cobrar' },
            { msg: '¿Cómo vamos este mes?',                      agente: '👑 Luisito da resumen ejecutivo general' },
            { msg: '[Foto de factura]',                          agente: '📊 Ana analiza y clasifica el gasto' },
            { msg: 'Carlos, ¿qué productos tienen stock bajo?',  agente: '📦 Carlos revisa el inventario' },
          ].map((e, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 max-w-xs">
                <p className="text-xs text-green-300">{e.msg}</p>
              </div>
              <div className="text-muted-foreground text-xs mt-2">→</div>
              <div className="flex-1 bg-muted/20 border border-border rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">{e.agente}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pasos de configuración */}
      <div className="card-sistema p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          Configuración paso a paso
        </h2>
        <div className="space-y-5">
          {PASOS.map(paso => (
            <div key={paso.num} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                {paso.num}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{paso.titulo}</p>
                <p className="text-xs text-muted-foreground mt-1">{paso.desc}</p>

                {paso.link && (
                  <a href={paso.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2">
                    {paso.linkLabel} <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {paso.webhook && (
                  <div className="flex items-center gap-2 mt-2 bg-muted/30 rounded-lg px-3 py-2 border border-border">
                    <code className="text-xs font-mono text-green-400 flex-1 break-all">{paso.webhook}</code>
                    <button onClick={() => copiar(paso.webhook!, 'webhook')}
                      className="shrink-0 text-muted-foreground hover:text-foreground">
                      {copiado === 'webhook' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {paso.vars && (
                  <div className="mt-2 space-y-1.5">
                    {paso.vars.map(v => (
                      <div key={v.key} className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2 border border-border">
                        <code className="text-xs font-mono text-yellow-400 w-52 shrink-0">{v.key}</code>
                        <span className="text-xs text-muted-foreground flex-1">{v.hint}</span>
                        <button onClick={() => copiar(v.key, v.key)}
                          className="shrink-0 text-muted-foreground hover:text-foreground">
                          {copiado === v.key ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota Firebase Admin */}
      <div className="card-sistema p-4 border border-yellow-500/30 bg-yellow-500/5">
        <h3 className="font-medium text-sm text-yellow-400 mb-1">⚠ Sobre las variables de Firebase</h3>
        <p className="text-xs text-muted-foreground">
          Las variables <code className="text-yellow-400">FIREBASE_PROJECT_ID</code>, <code className="text-yellow-400">FIREBASE_CLIENT_EMAIL</code> y <code className="text-yellow-400">FIREBASE_PRIVATE_KEY</code> requieren un <strong>Service Account</strong> de Firebase Admin.
          Ve a Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.
          Esto permite que el webhook lea datos reales del sistema desde el servidor.
        </p>
      </div>
    </div>
  );
}
