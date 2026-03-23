'use client';

/**
 * app/conciliacion/page.tsx
 * Módulo de Conciliación Bancaria con IA
 *
 * FLUJO:
 * 1. Usuario sube estado de cuenta (PDF/imagen) o ingresa movimientos manualmente
 * 2. IA extrae y estructura todos los movimientos bancarios
 * 3. Sistema carga ventas+gastos de Firestore del período
 * 4. IA coteja movimiento por movimiento → conciliado / no conciliado / discrepancia
 * 5. Usuario revisa, corrige y aprueba el informe final
 */

import { useState, useCallback, useRef } from 'react';
import { useVentas } from '@/lib/useVentas';
import { useGastos } from '@/lib/useGastos';
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Download, Plus, Trash2, ChevronDown, ChevronUp,
  Building2, TrendingUp, TrendingDown, Scale,
} from 'lucide-react';

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface MovimientoBancario {
  id: string;
  fecha: string;
  descripcion: string;
  referencia: string;
  debito: number;   // salida de dinero
  credito: number;  // entrada de dinero
  tipo: 'debito' | 'credito';
  fuente: 'banco';
}

interface MovimientoSistema {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: 'ingreso' | 'egreso';
  origen: 'venta' | 'gasto';
  referencia?: string;
}

type EstadoCotejo = 'conciliado' | 'no_encontrado' | 'discrepancia' | 'pendiente';

interface LineaCotejo {
  id: string;
  movBanco: MovimientoBancario | null;
  movSistema: MovimientoSistema | null;
  estado: EstadoCotejo;
  diferencia: number;
  nota: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatBs(n: number) {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function badgeColor(estado: EstadoCotejo) {
  if (estado === 'conciliado')    return { bg: 'rgba(34,197,94,0.12)',  border: '#22C55E40', text: '#22C55E' };
  if (estado === 'no_encontrado') return { bg: 'rgba(239,68,68,0.12)',  border: '#EF444440', text: '#EF4444' };
  if (estado === 'discrepancia')  return { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B40', text: '#F59E0B' };
  return { bg: 'rgba(100,116,139,0.12)', border: '#64748B40', text: '#64748B' };
}

function badgeLabel(estado: EstadoCotejo) {
  if (estado === 'conciliado')    return '✓ Conciliado';
  if (estado === 'no_encontrado') return '✗ No encontrado';
  if (estado === 'discrepancia')  return '⚠ Discrepancia';
  return '· Pendiente';
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ConciliacionPage() {
  const { ventas, cargando: cV } = useVentas();
  const { gastos, cargando: cG } = useGastos();

  const inputRef = useRef<HTMLInputElement>(null);

  // Estado general
  const [paso, setPaso] = useState<'subir' | 'revisar_banco' | 'cotejando' | 'resultado'>('subir');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Movimientos banco (extraídos por IA o ingresados manualmente)
  const [movsBanco, setMovsBanco] = useState<MovimientoBancario[]>([]);
  const [infoBanco, setInfoBanco] = useState({ banco: '', cuenta: '', periodo: '', saldoInicial: 0, saldoFinal: 0 });

  // Resultado cotejo
  const [lineas, setLineas] = useState<LineaCotejo[]>([]);
  const [resumen, setResumen] = useState({ conciliados: 0, noEncontrados: 0, discrepancias: 0, totalBanco: 0, totalSistema: 0 });

  // Entrada manual
  const [mostrarManual, setMostrarManual] = useState(false);
  const [movManual, setMovManual] = useState({ fecha: '', descripcion: '', referencia: '', monto: '', tipo: 'credito' });

  // Detalle expandido
  const [expandido, setExpandido] = useState<string | null>(null);

  // ── PASO 1: Subir y analizar estado de cuenta ──────────────────────────────
  const analizarDocumento = useCallback(async (file: File) => {
    setAnalizando(true);
    setErrMsg('');

    try {
      const esImagen = file.type.startsWith('image/');
      let body: Record<string, unknown>;

      const system = `Eres un parser de estados de cuenta bancarios venezolanos. Tu ÚNICA tarea es extraer movimientos y devolver JSON.

RESPONDE ÚNICAMENTE CON EL JSON, SIN NINGÚN TEXTO ANTES NI DESPUÉS. NI SIQUIERA UNA PALABRA DE INTRODUCCIÓN.

El JSON debe tener exactamente esta estructura:
{"banco":"string","cuenta":"string","periodo":"string","saldoInicial":0,"saldoFinal":0,"movimientos":[{"fecha":"YYYY-MM-DD","descripcion":"string","referencia":"string","debito":0,"credito":0}]}

REGLAS:
- debito = salida de dinero (pagos, retiros)
- credito = entrada de dinero (depósitos, cobros)
- montos como números con punto decimal, sin separadores de miles
- fechas en formato YYYY-MM-DD
- Si el año no está claro usa el año actual
- saldoInicial y saldoFinal en 0 si no aparecen
- TU RESPUESTA DEBE COMENZAR CON { Y TERMINAR CON }`;

      if (esImagen) {
        const reader = new FileReader();
        const base64: string = await new Promise((res, rej) => {
          reader.onload = (e) => res((e.target?.result as string).split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        body = {
          system,
          messages: [{ role: 'user', content: 'Analiza este estado de cuenta bancario y extrae todos los movimientos en el formato JSON especificado.' }],
          imageBase64: base64,
          imageMime: file.type,
        };
      } else {
        // PDF y otros: intentar leer como texto primero, si falla enviar como base64
        let bodyFinal: Record<string, unknown>;
        try {
          const texto: string = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = (e) => {
              const result = e.target?.result as string;
              // Si el texto tiene muchos caracteres raros, es binario
              let printable = 0;
              for (let i = 0; i < result.length; i++) {
                const code = result.charCodeAt(i);
                if (code >= 32 && code <= 126) printable++;
              }
              if (printable < result.length * 0.3) rej(new Error('binary'));
              else res(result);
            };
            r.onerror = rej;
            r.readAsText(file, 'utf-8');
          });
          bodyFinal = {
            system,
            messages: [{ role: 'user', content: `Extrae los movimientos de este estado de cuenta bancario en JSON.

CONTENIDO:
${texto.substring(0, 12000)}` }],
          };
        } catch {
          // Archivo binario (PDF real) — enviar como imagen base64
          const base64: string = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = (e) => res((e.target?.result as string).split(',')[1]);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
          bodyFinal = {
            system,
            messages: [{ role: 'user', content: 'Extrae los movimientos de este estado de cuenta bancario en JSON.' }],
            imageBase64: base64,
            imageMime: 'image/jpeg', // Groq acepta esto para PDFs simples
          };
        }
        body = bodyFinal;
      }

      const res = await fetch('/api/chat-agente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Parser robusto — extraer JSON aunque haya texto alrededor
      let rawText = data.text || '';
      // Quitar markdown code blocks
      rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      // Encontrar el primer { y el último } para extraer solo el JSON
      const jsonStart = rawText.indexOf('{');
      const jsonEnd   = rawText.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('La IA no devolvió JSON válido. Intenta con una imagen más clara o usa la entrada manual.');
      }
      const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
      let parsed: any;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseErr) {
        throw new Error(`Error parseando JSON: ${(parseErr as Error).message}. Respuesta recibida: ${rawText.substring(0, 200)}`);
      }

      const movs: MovimientoBancario[] = (parsed.movimientos || []).map((m: any, i: number) => ({
        id: `banco-${i}`,
        fecha: m.fecha || '',
        descripcion: m.descripcion || '',
        referencia: m.referencia || '',
        debito: Number(m.debito) || 0,
        credito: Number(m.credito) || 0,
        tipo: (Number(m.credito) > 0 ? 'credito' : 'debito') as 'credito' | 'debito',
        fuente: 'banco' as const,
      }));

      setMovsBanco(movs);
      setInfoBanco({
        banco: parsed.banco || '',
        cuenta: parsed.cuenta || '',
        periodo: parsed.periodo || '',
        saldoInicial: Number(parsed.saldoInicial) || 0,
        saldoFinal: Number(parsed.saldoFinal) || 0,
      });
      setPaso('revisar_banco');
    } catch (err: any) {
      setErrMsg(`Error analizando el documento: ${err.message}. Intenta con otra imagen más clara o usa entrada manual.`);
    }
    setAnalizando(false);
  }, []);

  // ── PASO 2: Cotejo con sistema ─────────────────────────────────────────────
  const ejecutarCotejo = useCallback(async () => {
    setPaso('cotejando');

    // Construir movimientos del sistema
    const movsVentas: MovimientoSistema[] = ventas.map(v => ({
      id: v.id,
      fecha: v.fecha,
      descripcion: v.items?.[0]?.nombre ? `Venta: ${v.items[0].nombre}` : `Venta #${v.numeroRecibo}`,
      monto: v.total,
      tipo: 'ingreso' as const,
      origen: 'venta' as const,
      referencia: v.numeroRecibo,
    }));

    // Normalizar fecha de gastos: puede venir como DD/MM/YYYY o YYYY-MM-DD
    const normalizarFecha = (f: string): string => {
      if (!f) return '';
      if (f.includes('/')) {
        const [d, m, y] = f.split('/');
        return `${y?.substring(0,4)}-${m?.padStart(2,'0')}-${d?.padStart(2,'0')}`;
      }
      return f.split('T')[0]; // quitar hora si viene con timestamp
    };

    const movsGastos: MovimientoSistema[] = (gastos as any[]).map((g: any) => ({
      id: g.id,
      fecha: normalizarFecha(g.fecha),
      descripcion: g.descripcion,
      monto: g.montoBs,
      tipo: 'egreso' as const,
      origen: 'gasto' as const,
      referencia: g.referencia || '',
    }));

    const todosSistema = [...movsVentas, ...movsGastos];

    // Llamar a IA para cotejo inteligente
    const systemPrompt = `Eres un contador experto en conciliación bancaria venezolana.
Debes cotejar los movimientos del estado de cuenta bancario contra los registros del sistema contable.
Responde SOLO en JSON válido, sin texto adicional.

CRITERIOS DE COTEJO:
- "conciliado": el movimiento bancario coincide con un registro del sistema (misma fecha ±3 días, monto igual o muy similar ±2%)
- "discrepancia": existe un registro similar pero con diferencia de monto significativa (>2%) o fecha >3 días
- "no_encontrado": no existe ningún registro en el sistema que corresponda a este movimiento bancario

Responde con este formato:
{
  "lineas": [
    {
      "idBanco": "id del movimiento bancario",
      "idSistema": "id del movimiento del sistema o null",
      "estado": "conciliado|discrepancia|no_encontrado",
      "diferencia": número (monto banco - monto sistema, 0 si no hay match),
      "nota": "explicación breve en español"
    }
  ],
  "movsSistemaNoEnBanco": ["id1","id2"] // registros del sistema sin movimiento bancario correspondiente
}`;

    const userMsg = `MOVIMIENTOS BANCARIOS:
${JSON.stringify(movsBanco.map(m => ({ id: m.id, fecha: m.fecha, descripcion: m.descripcion, debito: m.debito, credito: m.credito, referencia: m.referencia })), null, 2)}

REGISTROS DEL SISTEMA:
${JSON.stringify(todosSistema.map(m => ({ id: m.id, fecha: m.fecha, descripcion: m.descripcion, monto: m.monto, tipo: m.tipo, referencia: m.referencia })), null, 2)}

Realiza la conciliación completa.`;

    try {
      const res = await fetch('/api/chat-agente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const texto = data.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(texto);

      // Construir líneas de cotejo
      const lineasCotejo: LineaCotejo[] = parsed.lineas.map((l: any) => {
        const banco = movsBanco.find(m => m.id === l.idBanco) || null;
        const sistema = todosSistema.find(m => m.id === l.idSistema) || null;
        return {
          id: l.idBanco,
          movBanco: banco,
          movSistema: sistema,
          estado: l.estado as EstadoCotejo,
          diferencia: Number(l.diferencia) || 0,
          nota: l.nota || '',
        };
      });

      // Agregar registros del sistema sin movimiento bancario
      (parsed.movsSistemaNoEnBanco || []).forEach((id: string, i: number) => {
        const sis = todosSistema.find(m => m.id === id);
        if (sis) {
          lineasCotejo.push({
            id: `sin-banco-${i}`,
            movBanco: null,
            movSistema: sis,
            estado: 'no_encontrado',
            diferencia: sis.monto,
            nota: 'Registrado en sistema pero no aparece en el banco',
          });
        }
      });

      const conciliados    = lineasCotejo.filter(l => l.estado === 'conciliado').length;
      const noEncontrados  = lineasCotejo.filter(l => l.estado === 'no_encontrado').length;
      const discrepancias  = lineasCotejo.filter(l => l.estado === 'discrepancia').length;
      const totalBanco     = movsBanco.reduce((a, m) => a + m.credito - m.debito, 0);
      const totalSistema   = movsVentas.reduce((a, v) => a + v.monto, 0) - movsGastos.reduce((a, g) => a + g.monto, 0);

      setLineas(lineasCotejo);
      setResumen({ conciliados, noEncontrados, discrepancias, totalBanco, totalSistema });
      setPaso('resultado');
    } catch (err: any) {
      setErrMsg(`Error en cotejo: ${err.message}`);
      setPaso('revisar_banco');
    }
  }, [movsBanco, ventas, gastos]);

  // ── AGREGAR MOVIMIENTO MANUAL ──────────────────────────────────────────────
  const agregarManual = () => {
    if (!movManual.fecha || !movManual.descripcion || !movManual.monto) return;
    const monto = parseFloat(movManual.monto);
    const nuevo: MovimientoBancario = {
      id: `manual-${Date.now()}`,
      fecha: movManual.fecha,
      descripcion: movManual.descripcion,
      referencia: movManual.referencia,
      debito: movManual.tipo === 'debito' ? monto : 0,
      credito: movManual.tipo === 'credito' ? monto : 0,
      tipo: movManual.tipo as 'credito' | 'debito',
      fuente: 'banco',
    };
    setMovsBanco(prev => [...prev, nuevo]);
    setMovManual({ fecha: '', descripcion: '', referencia: '', monto: '', tipo: 'credito' });
  };

  const eliminarMov = (id: string) => setMovsBanco(prev => prev.filter(m => m.id !== id));

  // ── EXPORTAR INFORME ───────────────────────────────────────────────────────
  const exportarCSV = () => {
    const rows = [
      ['Estado', 'Fecha Banco', 'Descripción Banco', 'Débito', 'Crédito', 'Fecha Sistema', 'Descripción Sistema', 'Monto Sistema', 'Diferencia', 'Nota'],
      ...lineas.map(l => [
        badgeLabel(l.estado),
        l.movBanco?.fecha || '',
        l.movBanco?.descripcion || '(sin movimiento bancario)',
        l.movBanco?.debito || 0,
        l.movBanco?.credito || 0,
        l.movSistema?.fecha || '',
        l.movSistema?.descripcion || '(no registrado)',
        l.movSistema?.monto || 0,
        l.diferencia,
        l.nota,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `conciliacion-${infoBanco.periodo || 'atempo'}.csv`; a.click();
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-400" />
            Conciliación Bancaria
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cotejo inteligente de estado de cuenta vs registros del sistema · Potenciado con IA
          </p>
        </div>
        {paso === 'resultado' && (
          <div className="flex gap-2">
            <button onClick={() => { setPaso('subir'); setMovsBanco([]); setLineas([]); setArchivo(null); }}
              className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4" /> Nueva conciliación
            </button>
            <button onClick={exportarCSV}
              className="btn-primary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {errMsg && (
        <div className="card-sistema border border-red-500/30 bg-red-500/5 p-4 flex gap-3 items-start">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">Error</p>
            <p className="text-muted-foreground text-xs mt-1">{errMsg}</p>
          </div>
          <button onClick={() => setErrMsg('')} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* ── PASO 1: SUBIR DOCUMENTO ── */}
      {paso === 'subir' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drop zone */}
          <div className="card-sistema p-6">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              Subir Estado de Cuenta
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Imagen o PDF del estado de cuenta bancario. La IA extraerá todos los movimientos automáticamente.</p>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setArchivo(f); analizarDocumento(f); } }}
              className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-400/50 transition-colors"
            >
              <input ref={inputRef} type="file" className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setArchivo(f); analizarDocumento(f); } }} />
              {analizando ? (
                <>
                  <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
                  <p className="text-sm font-medium">Analizando documento con IA...</p>
                  <p className="text-xs text-muted-foreground">Extrayendo movimientos bancarios</p>
                </>
              ) : (
                <>
                  <FileText className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm font-medium">{archivo ? archivo.name : 'Click o arrastra el estado de cuenta aquí'}</p>
                  <p className="text-xs text-muted-foreground">PNG · JPG · PDF · WEBP</p>
                </>
              )}
            </div>
          </div>

          {/* Entrada manual */}
          <div className="card-sistema p-6">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-400" />
              Ingresar Movimientos Manualmente
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Si tienes los movimientos en otra fuente o quieres agregar datos adicionales, ingrésalos aquí.</p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Fecha</label>
                  <input type="date" value={movManual.fecha} onChange={e => setMovManual(p => ({ ...p, fecha: e.target.value }))}
                    className="input-sistema w-full mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <select value={movManual.tipo} onChange={e => setMovManual(p => ({ ...p, tipo: e.target.value }))}
                    className="input-sistema w-full mt-1 text-sm">
                    <option value="credito">Crédito (entrada)</option>
                    <option value="debito">Débito (salida)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Descripción</label>
                <input type="text" value={movManual.descripcion} onChange={e => setMovManual(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Ej: Transferencia recibida - Cliente XYZ"
                  className="input-sistema w-full mt-1 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Monto (Bs)</label>
                  <input type="number" value={movManual.monto} onChange={e => setMovManual(p => ({ ...p, monto: e.target.value }))}
                    placeholder="0.00" className="input-sistema w-full mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Referencia</label>
                  <input type="text" value={movManual.referencia} onChange={e => setMovManual(p => ({ ...p, referencia: e.target.value }))}
                    placeholder="Opcional" className="input-sistema w-full mt-1 text-sm" />
                </div>
              </div>
              <button onClick={agregarManual}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Agregar movimiento
              </button>
            </div>

            {movsBanco.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">{movsBanco.length} movimientos cargados</p>
                <button onClick={() => setPaso('revisar_banco')} className="btn-secondary w-full text-sm">
                  Revisar y continuar →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PASO 2: REVISAR MOVIMIENTOS BANCARIOS ── */}
      {(paso === 'revisar_banco' || paso === 'cotejando') && (
        <div className="space-y-4">
          {/* Info banco */}
          {(infoBanco.banco || infoBanco.periodo) && (
            <div className="card-sistema p-4 flex flex-wrap gap-4 items-center">
              <Building2 className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-semibold text-sm">{infoBanco.banco || 'Banco'}</p>
                <p className="text-xs text-muted-foreground">Cuenta: {infoBanco.cuenta} · {infoBanco.periodo}</p>
              </div>
              <div className="ml-auto flex gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Saldo inicial</p>
                  <p className="font-mono text-sm">{formatBs(infoBanco.saldoInicial)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Saldo final</p>
                  <p className="font-mono text-sm font-bold">{formatBs(infoBanco.saldoFinal)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabla movimientos banco */}
          <div className="card-sistema overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Movimientos bancarios extraídos ({movsBanco.length})
              </h2>
              <button onClick={() => setMostrarManual(!mostrarManual)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Plus className="w-3 h-3" /> Agregar manual
              </button>
            </div>

            {mostrarManual && (
              <div className="p-4 border-b border-border bg-muted/20">
                <div className="grid grid-cols-5 gap-2 items-end">
                  <input type="date" value={movManual.fecha} onChange={e => setMovManual(p => ({ ...p, fecha: e.target.value }))} className="input-sistema text-xs" />
                  <input type="text" value={movManual.descripcion} onChange={e => setMovManual(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción" className="input-sistema text-xs" />
                  <input type="number" value={movManual.monto} onChange={e => setMovManual(p => ({ ...p, monto: e.target.value }))} placeholder="Monto Bs" className="input-sistema text-xs" />
                  <select value={movManual.tipo} onChange={e => setMovManual(p => ({ ...p, tipo: e.target.value }))} className="input-sistema text-xs">
                    <option value="credito">Crédito</option>
                    <option value="debito">Débito</option>
                  </select>
                  <button onClick={agregarManual} className="btn-primary text-xs py-2">+ Agregar</button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Descripción</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Referencia</th>
                    <th className="text-right p-3 font-medium text-green-400">Crédito</th>
                    <th className="text-right p-3 font-medium text-red-400">Débito</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {movsBanco.map(m => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3 font-mono">{m.fecha}</td>
                      <td className="p-3 max-w-xs truncate">{m.descripcion}</td>
                      <td className="p-3 text-muted-foreground font-mono">{m.referencia || '—'}</td>
                      <td className="p-3 text-right font-mono text-green-400">{m.credito > 0 ? formatBs(m.credito) : '—'}</td>
                      <td className="p-3 text-right font-mono text-red-400">{m.debito > 0 ? formatBs(m.debito) : '—'}</td>
                      <td className="p-3">
                        <button onClick={() => eliminarMov(m.id)} className="text-muted-foreground hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td colSpan={3} className="p-3 text-xs text-muted-foreground">TOTALES</td>
                    <td className="p-3 text-right font-mono text-green-400 text-xs">
                      {formatBs(movsBanco.reduce((a, m) => a + m.credito, 0))}
                    </td>
                    <td className="p-3 text-right font-mono text-red-400 text-xs">
                      {formatBs(movsBanco.reduce((a, m) => a + m.debito, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <button
            onClick={ejecutarCotejo}
            disabled={movsBanco.length === 0 || paso === 'cotejando'}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {paso === 'cotejando' ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Cotejando con IA — esto puede tomar unos segundos...</>
            ) : (
              <><Scale className="w-4 h-4" /> Ejecutar conciliación con IA ({movsBanco.length} movimientos)</>
            )}
          </button>
        </div>
      )}

      {/* ── PASO 3: RESULTADO CONCILIACIÓN ── */}
      {paso === 'resultado' && (
        <div className="space-y-4">
          {/* KPIs resumen */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total banco', val: formatBs(Math.abs(resumen.totalBanco)), icon: Building2, color: 'text-blue-400' },
              { label: 'Total sistema', val: formatBs(Math.abs(resumen.totalSistema)), icon: Scale, color: 'text-purple-400' },
              { label: 'Conciliados', val: String(resumen.conciliados), icon: CheckCircle2, color: 'text-green-400' },
              { label: 'Discrepancias', val: String(resumen.discrepancias), icon: AlertTriangle, color: 'text-yellow-400' },
              { label: 'No encontrados', val: String(resumen.noEncontrados), icon: XCircle, color: 'text-red-400' },
            ].map(k => (
              <div key={k.label} className="card-sistema p-4">
                <div className="flex items-center gap-2 mb-1">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
                <p className={`font-bold font-mono text-sm ${k.color}`}>{k.val}</p>
              </div>
            ))}
          </div>

          {/* Diferencia neta */}
          {Math.abs(resumen.totalBanco - resumen.totalSistema) > 1 && (
            <div className="card-sistema p-4 border border-yellow-500/30 bg-yellow-500/5 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Diferencia neta detectada</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Banco: {formatBs(resumen.totalBanco)} · Sistema: {formatBs(resumen.totalSistema)} ·
                  <span className="font-mono text-yellow-400 ml-1">Δ {formatBs(Math.abs(resumen.totalBanco - resumen.totalSistema))}</span>
                </p>
              </div>
            </div>
          )}

          {/* Tabla detalle */}
          <div className="card-sistema overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-sm">Detalle de cotejo ({lineas.length} líneas)</h2>
            </div>
            <div className="divide-y divide-border/50">
              {lineas.map(l => {
                const colors = badgeColor(l.estado);
                const isExp = expandido === l.id;
                return (
                  <div key={l.id}>
                    <div
                      className="p-3 hover:bg-muted/20 cursor-pointer flex items-start gap-3"
                      onClick={() => setExpandido(isExp ? null : l.id)}
                    >
                      {/* Badge estado */}
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
                        {badgeLabel(l.estado)}
                      </span>
                      {/* Info banco */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{l.movBanco?.fecha || l.movSistema?.fecha || '—'}</span>
                          <span className="text-sm truncate">{l.movBanco?.descripcion || l.movSistema?.descripcion || '—'}</span>
                          {l.movBanco?.referencia && <span className="text-xs text-muted-foreground font-mono">#{l.movBanco.referencia}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          {l.movBanco && (
                            <span className={`text-xs font-mono font-medium ${l.movBanco.credito > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {l.movBanco.credito > 0
                                ? `↑ ${formatBs(l.movBanco.credito)}`
                                : `↓ ${formatBs(l.movBanco.debito)}`}
                            </span>
                          )}
                          {l.movSistema && (
                            <span className="text-xs text-muted-foreground">
                              Sistema: {formatBs(l.movSistema.monto)} ({l.movSistema.origen})
                            </span>
                          )}
                          {l.diferencia !== 0 && (
                            <span className="text-xs font-mono text-yellow-400">Δ {formatBs(Math.abs(l.diferencia))}</span>
                          )}
                        </div>
                      </div>
                      {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                    {/* Detalle expandido */}
                    {isExp && (
                      <div className="px-4 pb-4 bg-muted/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-blue-400 mb-2">Movimiento bancario</p>
                            {l.movBanco ? (
                              <>
                                <p className="text-xs"><span className="text-muted-foreground">Fecha: </span>{l.movBanco.fecha}</p>
                                <p className="text-xs"><span className="text-muted-foreground">Descripción: </span>{l.movBanco.descripcion}</p>
                                <p className="text-xs"><span className="text-muted-foreground">Referencia: </span>{l.movBanco.referencia || '—'}</p>
                                <p className="text-xs"><span className="text-muted-foreground">Crédito: </span><span className="text-green-400 font-mono">{formatBs(l.movBanco.credito)}</span></p>
                                <p className="text-xs"><span className="text-muted-foreground">Débito: </span><span className="text-red-400 font-mono">{formatBs(l.movBanco.debito)}</span></p>
                              </>
                            ) : <p className="text-xs text-muted-foreground italic">Sin movimiento bancario correspondiente</p>}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-purple-400 mb-2">Registro en sistema</p>
                            {l.movSistema ? (
                              <>
                                <p className="text-xs"><span className="text-muted-foreground">Fecha: </span>{l.movSistema.fecha}</p>
                                <p className="text-xs"><span className="text-muted-foreground">Descripción: </span>{l.movSistema.descripcion}</p>
                                <p className="text-xs"><span className="text-muted-foreground">Monto: </span><span className="font-mono">{formatBs(l.movSistema.monto)}</span></p>
                                <p className="text-xs"><span className="text-muted-foreground">Tipo: </span>{l.movSistema.tipo} · {l.movSistema.origen}</p>
                                {l.movSistema.referencia && <p className="text-xs"><span className="text-muted-foreground">Referencia: </span>{l.movSistema.referencia}</p>}
                              </>
                            ) : <p className="text-xs text-muted-foreground italic">No registrado en el sistema</p>}
                          </div>
                        </div>
                        {l.nota && (
                          <div className="mt-3 p-2 rounded-lg bg-muted/20 border border-border">
                            <p className="text-xs text-muted-foreground">💬 Nota IA: <span className="text-foreground">{l.nota}</span></p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
