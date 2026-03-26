'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, Download, Plus, Trash2, ChevronDown, ChevronUp, 
  Building2, Scale 
} from 'lucide-react';
import { useVentas } from '@/lib/useVentas';
import { useGastos } from '@/lib/useGastos';

interface MovimientoBancario {
  id: string;
  fecha: string;
  descripcion: string;
  referencia: string;
  debito: number;
  credito: number;
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

function formatBs(n: number) {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function badgeColor(estado: EstadoCotejo) {
  if (estado === 'conciliado') return { bg: 'rgba(34,197,94,0.12)', border: '#22C55E40', text: '#22C55E' };
  if (estado === 'no_encontrado') return { bg: 'rgba(239,68,68,0.12)', border: '#EF444440', text: '#EF4444' };
  if (estado === 'discrepancia') return { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B40', text: '#F59E0B' };
  return { bg: 'rgba(100,116,139,0.12)', border: '#64748B40', text: '#64748B' };
}

function badgeLabel(estado: EstadoCotejo) {
  if (estado === 'conciliado') return '✓ Conciliado';
  if (estado === 'no_encontrado') return '✗ No encontrado';
  if (estado === 'discrepancia') return '⚠ Discrepancia';
  return '· Pendiente';
}

export default function ConciliacionPage() {
  const { ventas, cargando: cV } = useVentas();
  const { gastos, cargando: cG } = useGastos();

  const inputRef = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState<'subir' | 'revisar_banco' | 'cotejando' | 'resultado'>('subir');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [movsBanco, setMovsBanco] = useState<MovimientoBancario[]>([]);
  const [infoBanco, setInfoBanco] = useState({ banco: '', cuenta: '', periodo: '', saldoInicial: 0, saldoFinal: 0 });
  const [lineas, setLineas] = useState<LineaCotejo[]>([]);
  const [resumen, setResumen] = useState({ conciliados: 0, noEncontrados: 0, discrepancias: 0, totalBanco: 0, totalSistema: 0 });
  const [mostrarManual, setMostrarManual] = useState(false);
  const [movManual, setMovManual] = useState({ fecha: '', descripcion: '', referencia: '', monto: '', tipo: 'credito' });
  const [expandido, setExpandido] = useState<string | null>(null);

  const analizarDocumento = useCallback(async (file: File) => {
    setAnalizando(true);
    setErrMsg('');

    try {
      if (file.type === 'application/pdf') {
        throw new Error("El modelo visual no lee PDFs. Por favor, sube una captura de pantalla (JPG/PNG).");
      }

      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
      });

      const res = await fetch('/api/chat-agente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `Actúa como un sistema contable automatizado. Extrae los datos de esta imagen y devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional ni formato markdown:
          {
            "banco": "nombre",
            "cuenta": "numero",
            "periodo": "rango fechas",
            "saldoInicial": 0,
            "saldoFinal": 0,
            "movimientos": [
              {"fecha": "YYYY-MM-DD", "descripcion": "texto", "referencia": "texto", "debito": 0, "credito": 0}
            ]
          }`,
          messages: [{ role: 'user', content: "Genera el JSON con los movimientos de este estado de cuenta." }],
          imageBase64: base64,
          imageMime: file.type
        }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
      if (data.error) throw new Error(data.error);

      let parsed;
      try { parsed = JSON.parse(data.text); } 
      catch (e) { throw new Error(`Basura en el JSON: ${data.text.substring(0, 100)}`); }
      
      const movsFormateados = (parsed.movimientos || []).map((m: any, i: number) => ({
        id: `banco-${i}-${Date.now()}`,
        fecha: m.fecha,
        descripcion: m.descripcion,
        referencia: m.referencia,
        debito: Number(m.debito) || 0,
        credito: Number(m.credito) || 0,
        tipo: m.credito > 0 ? 'credito' : 'debito',
        fuente: 'banco'
      }));

      setMovsBanco(movsFormateados);
      setInfoBanco({
        banco: parsed.banco || '', cuenta: parsed.cuenta || '', periodo: parsed.periodo || '',
        saldoInicial: Number(parsed.saldoInicial) || 0, saldoFinal: Number(parsed.saldoFinal) || 0,
      });
      setPaso('revisar_banco');
    } catch (err: any) {
      console.error(err);
      setErrMsg(`Fallo técnico: ${err.message}`);
    } finally {
      setAnalizando(false);
    }
  }, []);

  const ejecutarCotejo = useCallback(async () => {
    setPaso('cotejando');
    const movsVentas: MovimientoSistema[] = ventas.map(v => ({
      id: v.id, fecha: v.fecha, descripcion: `Venta #${v.numeroRecibo}`, monto: v.total, tipo: 'ingreso', origen: 'venta', referencia: v.numeroRecibo,
    }));
    const movsGastos: MovimientoSistema[] = (gastos as any[]).map((g: any) => ({
      id: g.id, fecha: g.fecha.split('T')[0], descripcion: g.descripcion, monto: g.montoBs, tipo: 'egreso', origen: 'gasto', referencia: g.referencia || '',
    }));
    const todosSistema = [...movsVentas, ...movsGastos];

    try {
      const res = await fetch('/api/chat-agente', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `Eres un contador experto. Coteja movimientos y responde SOLO en JSON: {"lineas": [{"idBanco": "id", "idSistema": "id|null", "estado": "conciliado|discrepancia|no_encontrado", "diferencia": 0, "nota": "..."}], "movsSistemaNoEnBanco": ["id"]}`,
          messages: [{ role: 'user', content: `Bancos:\n${JSON.stringify(movsBanco)}\nSistema:\n${JSON.stringify(todosSistema)}` }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const parsed = JSON.parse(data.text.replace(/```json|```/g, '').trim());
      
      const lineasCotejo: LineaCotejo[] = parsed.lineas.map((l: any) => ({
        id: l.idBanco, movBanco: movsBanco.find(m => m.id === l.idBanco) || null, movSistema: todosSistema.find(m => m.id === l.idSistema) || null,
        estado: l.estado, diferencia: Number(l.diferencia) || 0, nota: l.nota || '',
      }));

      (parsed.movsSistemaNoEnBanco || []).forEach((id: string, i: number) => {
        const sis = todosSistema.find(m => m.id === id);
        if (sis) lineasCotejo.push({ id: `sin-banco-${i}`, movBanco: null, movSistema: sis, estado: 'no_encontrado', diferencia: sis.monto, nota: 'No en banco' });
      });

      setLineas(lineasCotejo);
      setResumen({
        conciliados: lineasCotejo.filter(l => l.estado === 'conciliado').length,
        noEncontrados: lineasCotejo.filter(l => l.estado === 'no_encontrado').length,
        discrepancias: lineasCotejo.filter(l => l.estado === 'discrepancia').length,
        totalBanco: movsBanco.reduce((a, m) => a + m.credito - m.debito, 0),
        totalSistema: movsVentas.reduce((a, v) => a + v.monto, 0) - movsGastos.reduce((a, g) => a + g.monto, 0)
      });
      setPaso('resultado');
    } catch (err: any) {
      setErrMsg(`Error en cotejo: ${err.message}`);
      setPaso('revisar_banco');
    }
  }, [movsBanco, ventas, gastos]);

  const agregarManual = () => {
    if (!movManual.fecha || !movManual.descripcion || !movManual.monto) return;
    const monto = parseFloat(movManual.monto);
    setMovsBanco(prev => [...prev, {
      id: `manual-${Date.now()}`, fecha: movManual.fecha, descripcion: movManual.descripcion, referencia: movManual.referencia,
      debito: movManual.tipo === 'debito' ? monto : 0, credito: movManual.tipo === 'credito' ? monto : 0, tipo: movManual.tipo as 'credito' | 'debito', fuente: 'banco'
    }]);
    setMovManual({ fecha: '', descripcion: '', referencia: '', monto: '', tipo: 'credito' });
  };

  const eliminarMov = (id: string) => setMovsBanco(prev => prev.filter(m => m.id !== id));

  const exportarCSV = () => {
    const rows = [['Estado', 'Fecha Banco', 'Descripción', 'Débito', 'Crédito', 'Sistema', 'Diferencia', 'Nota'], ...lineas.map(l => [
      badgeLabel(l.estado), l.movBanco?.fecha || '', l.movBanco?.descripcion || '', l.movBanco?.debito || 0, l.movBanco?.credito || 0,
      l.movSistema?.descripcion || '', l.diferencia, l.nota
    ])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'conciliacion.csv'; a.click();
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto text-slate-200">
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex gap-2"><Scale className="text-blue-400" /> Conciliación Bancaria</h1>
          <p className="text-slate-400 text-sm">Cotejo inteligente con IA</p>
        </div>
        {paso === 'resultado' && (
          <div className="flex gap-2">
            <button onClick={() => { setPaso('subir'); setMovsBanco([]); setLineas([]); }} className="bg-slate-800 px-4 py-2 rounded-lg flex gap-2 text-sm"><RefreshCw className="w-4 h-4"/> Nueva</button>
            <button onClick={exportarCSV} className="bg-blue-600 px-4 py-2 rounded-lg flex gap-2 text-sm"><Download className="w-4 h-4"/> Exportar</button>
          </div>
        )}
      </div>

      {errMsg && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex gap-2"><AlertTriangle/> {errMsg}</div>}

      {paso === 'subir' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-8 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center gap-4 text-center hover:bg-slate-800/30">
             <Upload className="w-8 h-8 text-blue-400" />
             <div>
               <h3 className="font-bold">Subir Estado de Cuenta</h3>
               <p className="text-sm text-slate-400">Sube una imagen (JPG/PNG) para extraer datos</p>
             </div>
             <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) { setArchivo(f); analizarDocumento(f); } }} className="absolute opacity-0 cursor-pointer w-full h-full" accept="image/png, image/jpeg, image/webp" />
             {analizando && <p className="text-blue-400 animate-pulse">Analizando...</p>}
          </div>

          <div className="p-6 bg-slate-800/50 rounded-2xl">
            <h3 className="font-bold mb-4 flex gap-2"><Plus className="text-green-400"/> Entrada Manual</h3>
            <div className="space-y-3">
               <input type="date" value={movManual.fecha} onChange={e => setMovManual(p => ({ ...p, fecha: e.target.value }))} className="w-full bg-slate-900 p-2 rounded" />
               <input type="text" placeholder="Descripción" value={movManual.descripcion} onChange={e => setMovManual(p => ({ ...p, descripcion: e.target.value }))} className="w-full bg-slate-900 p-2 rounded" />
               <div className="flex gap-2">
                 <input type="number" placeholder="Monto" value={movManual.monto} onChange={e => setMovManual(p => ({ ...p, monto: e.target.value }))} className="w-1/2 bg-slate-900 p-2 rounded" />
                 <select value={movManual.tipo} onChange={e => setMovManual(p => ({ ...p, tipo: e.target.value }))} className="w-1/2 bg-slate-900 p-2 rounded"><option value="credito">Crédito</option><option value="debito">Débito</option></select>
               </div>
               <button onClick={agregarManual} className="w-full bg-blue-600 p-2 rounded font-bold">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {(paso === 'revisar_banco' || paso === 'cotejando') && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-2xl p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-left border-b border-slate-700"><tr><th className="p-2">Fecha</th><th className="p-2">Desc</th><th className="p-2">Crédito</th><th className="p-2">Débito</th><th></th></tr></thead>
              <tbody>
                {movsBanco.map(m => (
                  <tr key={m.id} className="border-b border-slate-700/50">
                    <td className="p-2">{m.fecha}</td><td className="p-2">{m.descripcion}</td>
                    <td className="p-2 text-green-400">{m.credito > 0 ? formatBs(m.credito) : '-'}</td>
                    <td className="p-2 text-red-400">{m.debito > 0 ? formatBs(m.debito) : '-'}</td>
                    <td className="p-2"><button onClick={() => eliminarMov(m.id)}><Trash2 className="w-4 h-4 text-red-400"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={ejecutarCotejo} disabled={paso === 'cotejando'} className="w-full bg-blue-600 p-3 rounded-xl font-bold flex justify-center gap-2">
            {paso === 'cotejando' ? 'Cotejando con IA...' : `Cotejar ${movsBanco.length} movimientos`}
          </button>
        </div>
      )}

      {paso === 'resultado' && (
        <div className="bg-slate-800/50 rounded-2xl p-4">
           <h3 className="font-bold mb-4">Resultados ({lineas.length})</h3>
           {lineas.map(l => (
              <div key={l.id} className="p-3 border-b border-slate-700/50 text-sm flex justify-between">
                 <div>
                   <span style={{ color: badgeColor(l.estado).text }} className="font-bold">{badgeLabel(l.estado)}</span>
                   <p>{l.movBanco?.descripcion || l.movSistema?.descripcion}</p>
                 </div>
                 <div className="text-right">
                    <p className="font-mono">{formatBs(l.movBanco?.credito || l.movBanco?.debito || l.movSistema?.monto || 0)}</p>
                    {l.diferencia !== 0 && <p className="text-yellow-400 text-xs">Δ {formatBs(Math.abs(l.diferencia))}</p>}
                 </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
}
