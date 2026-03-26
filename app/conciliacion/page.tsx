'use client';

import React, { useState, useCallback } from 'react';
import { 
  FileText, Upload, CheckCircle2, AlertCircle, 
  ArrowRight, Search, Landmark, Calendar, DollarSign 
} from 'lucide-react';

interface Movimiento {
  id: string;
  fecha: string;
  descripcion: string;
  referencia?: string;
  monto: number;
  tipo: 'debito' | 'credito';
  fuente: 'banco' | 'sistema';
  conciliado?: boolean;
}

export default function ConciliacionBancaria() {
  const [paso, setPaso] = useState<'subir' | 'revisar_banco' | 'conciliar'>('subir');
  const [analizando, setAnalizando] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [movsBanco, setMovsBanco] = useState<Movimiento[]>([]);
  const [infoBanco, setInfoBanco] = useState<any>(null);

  const analizarDocumento = useCallback(async (file: File) => {
    setAnalizando(true);
    setErrMsg('');

    try {
      // Bloqueo directo de PDFs porque Groq Vision no los soporta
      if (file.type === 'application/pdf') {
        throw new Error("El modelo de IA actual no lee PDFs nativos. Por favor, sube una captura de pantalla (JPG/PNG) del estado de cuenta.");
      }

      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.onerror = error => reject(error);
      });

      const res = await fetch('/api/chat-agente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `Eres un experto contable. Analiza el estado de cuenta y extrae los datos en este JSON:
          {
            "banco": "nombre",
            "cuenta": "numero",
            "periodo": "rango fechas",
            "saldoInicial": 0,
            "saldoFinal": 0,
            "movimientos": [
              {"fecha": "YYYY-MM-DD", "descripcion": "texto", "referencia": "texto", "debito": 0, "credito": 0}
            ]
          }
          Responde UNICAMENTE el JSON.`,
          messages: [{ role: 'user', content: "Extrae todos los movimientos de este documento bancario." }],
          imageBase64: base64,
          imageMime: file.type
        }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || `Error del servidor HTTP ${res.status}`);
      if (data.error) throw new Error(data.error);

      let parsed;
      try {
        parsed = JSON.parse(data.text);
      } catch (parseError) {
        throw new Error("La IA no devolvió un JSON válido. Respuesta recibida: " + data.text.substring(0, 50) + "...");
      }
      
      const movsFormateados = (parsed.movimientos || []).map((m: any, i: number) => ({
        id: `banco-${i}-${Date.now()}`,
        fecha: m.fecha,
        descripcion: m.descripcion,
        referencia: m.referencia,
        monto: m.credito > 0 ? m.credito : m.debito,
        tipo: m.credito > 0 ? 'credito' : 'debito',
        fuente: 'banco'
      }));

      setMovsBanco(movsFormateados);
      setInfoBanco(parsed);
      setPaso('revisar_banco');
    } catch (err: any) {
      console.error("Error detallado:", err);
      // Ahora sí verás exactamente qué falló en la pantalla
      setErrMsg(`Fallo técnico: ${err.message}`);
    } finally {
      setAnalizando(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analizarDocumento(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="text-blue-400" /> Conciliación Bancaria
        </h1>
        <p className="text-slate-400 text-sm">Cotejo inteligente de estado de cuenta vs registros del sistema · Potenciado con IA</p>
      </div>

      {errMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="text-sm font-medium">{errMsg}</div>
        </div>
      )}

      {paso === 'subir' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-8 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-800/30 hover:bg-slate-800/50 transition-all group flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
            {analizando ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="font-medium animate-pulse">Analizando documento...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="text-blue-400 w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Subir Estado de Cuenta</h3>
                  <p className="text-slate-400 text-sm mt-1">Sube una imagen (JPG/PNG) del estado de cuenta bancario.</p>
                </div>
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg, image/webp"
                />
              </>
            )}
          </div>

          <div className="p-8 bg-slate-800/50 rounded-3xl border border-slate-700/50">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" /> Ingresar Movimientos Manualmente
            </h3>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase font-bold px-1">Fecha</label>
                  <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase font-bold px-1">Tipo</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors appearance-none">
                    <option>Crédito (entrada)</option>
                    <option>Débito (salida)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 uppercase font-bold px-1">Descripción</label>
                <input type="text" placeholder="Ej: Transferencia recibida - Cliente XYZ" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase font-bold px-1">Monto (Bs)</label>
                  <input type="number" placeholder="0.00" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase font-bold px-1">Referencia</label>
                  <input type="text" placeholder="Opcional" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2">
                + Agregar movimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {paso === 'revisar_banco' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden">
             <div className="p-6 border-b border-slate-700/50 bg-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Landmark className="text-blue-400 w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="font-bold text-lg">{infoBanco?.banco || 'Estado de Cuenta'}</h3>
                      <p className="text-slate-400 text-sm">Cuenta: {infoBanco?.cuenta || 'No detectada'} · {infoBanco?.periodo}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setPaso('conciliar')}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                >
                  Confirmar y Continuar <ArrowRight className="w-4 h-4" />
                </button>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                         <th className="p-4 font-bold">Fecha</th>
                         <th className="p-4 font-bold">Descripción</th>
                         <th className="p-4 font-bold">Referencia</th>
                         <th className="p-4 font-bold text-right">Monto (Bs)</th>
                         <th className="p-4 font-bold text-center">Tipo</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-700/50">
                      {movsBanco.map((mov) => (
                         <tr key={mov.id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="p-4 text-sm whitespace-nowrap">{mov.fecha}</td>
                            <td className="p-4 text-sm font-medium">{mov.descripcion}</td>
                            <td className="p-4 text-sm text-slate-400">{mov.referencia || '-'}</td>
                            <td className={`p-4 text-sm font-bold text-right ${mov.tipo === 'credito' ? 'text-green-400' : 'text-red-400'}`}>
                               {mov.tipo === 'credito' ? '+' : '-'}{mov.monto.toLocaleString('es-VE', {minimumFractionDigits: 2})}
                            </td>
                            <td className="p-4 text-center">
                               <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${mov.tipo === 'credito' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {mov.tipo}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
