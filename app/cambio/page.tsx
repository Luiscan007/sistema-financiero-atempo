'use client';

/**
 * app/cambio/page.tsx
 * Módulo completo de tasas de cambio y brecha cambiaria venezolana
 * Incluye: tasas actuales, brecha, calculadora de conversión, brecha personalizada, historial
 */

import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, TrendingDown, RefreshCw, Calculator, ArrowUpDown,
    DollarSign, AlertTriangle, Clock, BarChart3, Info, Zap,
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTasas } from '@/components/providers/TasasProvider';
import { obtenerHistorialTasas } from '@/lib/tasas';
import { formatBs, formatUSD, formatEUR, formatUSDT, colorBrecha, nivelBrecha, calcularBrecha } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Tipo de moneda para la calculadora
type Moneda = 'bs' | 'usd' | 'eur' | 'usdt';

const MONEDAS_INFO = {
    bs: { label: 'Bolívar (Bs)', simbolo: 'Bs', color: '#3b82f6' },
    usd: { label: 'Dólar (USD)', simbolo: '$', color: '#22c55e' },
    eur: { label: 'Euro (EUR)', simbolo: '€', color: '#8b5cf6' },
    usdt: { label: 'Tether (USDT)', simbolo: 'USDT', color: '#f59e0b' },
};

// Card de una tasa de cambio
function TasaCard({
    titulo,
    valor,
    valorBs,
    fuente,
    color,
    variacion,
}: {
    titulo: string;
    valor: string;
    valorBs?: string;
    fuente: string;
    color: string;
    variacion?: number;
}) {
    return (
        <div className="kpi-card group">
            <div className="flex items-start justify-between mb-3">
                <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${color}20`, color }}
                >
                    {fuente}
                </span>
                {variacion !== undefined && (
                    <div className={cn('flex items-center gap-1 text-xs', variacion >= 0 ? 'text-red-400' : 'text-green-400')}>
                        {variacion >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(variacion).toFixed(2)}%
                    </div>
                )}
            </div>
            <p className="text-xs text-muted-foreground mb-1">{titulo}</p>
            <p className="text-2xl font-bold font-mono" style={{ color }}>
                {valor}
            </p>
            {valorBs && (
                <p className="text-xs text-muted-foreground font-mono mt-1">{valorBs}</p>
            )}
        </div>
    );
}

// Card de brecha cambiaria
function BrechaCard({
    titulo,
    brechaPercent,
    tasaAlta,
    tasaBaja,
    labelAlta,
    labelBaja,
}: {
    titulo: string;
    brechaPercent: number;
    tasaAlta: number;
    tasaBaja: number;
    labelAlta: string;
    labelBaja: string;
}) {
    const nivel = nivelBrecha(brechaPercent);
    const colorClase = colorBrecha(brechaPercent);
    const brechaAlta = brechaPercent > 50;

    return (
        <div className={cn(
            'kpi-card',
            brechaAlta && 'border-red-500/40'
        )}>
            <div className="flex items-start justify-between mb-3">
                <span className="text-xs text-muted-foreground">{titulo}</span>
                <span className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded-full',
                    nivel === 'BAJA' && 'bg-green-500/20 text-green-400',
                    nivel === 'MEDIA' && 'bg-yellow-500/20 text-yellow-400',
                    nivel === 'ALTA' && 'bg-red-500/20 text-red-400',
                    brechaAlta && 'animate-pulse'
                )}>
                    {nivel}
                </span>
            </div>

            <div className={cn('flex items-center gap-2 mb-2', brechaAlta && 'animate-pulse-rojo rounded-lg')}>
                {brechaAlta && <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                <p className={cn('text-3xl font-bold font-mono', colorClase)}>
                    {brechaPercent.toFixed(2)}%
                </p>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                    <span>{labelBaja}</span>
                    <span className="font-mono text-blue-400">{formatBs(tasaBaja)}/USD</span>
                </div>
                <div className="flex justify-between">
                    <span>{labelAlta}</span>
                    <span className="font-mono text-yellow-400">{formatBs(tasaAlta)}/USD</span>
                </div>
                <div className="flex justify-between font-semibold">
                    <span>Diferencia</span>
                    <span className="font-mono text-foreground">{formatBs(tasaAlta - tasaBaja)}/USD</span>
                </div>
            </div>

            {/* Barra de progreso visual */}
            <div className="mt-3 bg-muted rounded-full h-1.5">
                <div
                    className={cn(
                        'h-1.5 rounded-full transition-all duration-500',
                        nivel === 'BAJA' && 'bg-green-500',
                        nivel === 'MEDIA' && 'bg-yellow-500',
                        nivel === 'ALTA' && 'bg-red-500'
                    )}
                    style={{ width: `${Math.min(brechaPercent, 100)}%` }}
                />
            </div>
        </div>
    );
}

// ============================
// CALCULADORA DE CONVERSIÓN
// ============================
function CalculadoraConversion({ tasas }: { tasas: any }) {
    const [montoInput, setMontoInput] = useState('100');
    const [monedaOrigen, setMonedaOrigen] = useState<Moneda>('usd');
    const [tasaCalc, setTasaCalc] = useState<'bcv' | 'paralelo'>('bcv');

    const monto = parseFloat(montoInput) || 0;
    const tarifaUSD = tasaCalc === 'bcv' ? tasas.bcv : tasas.paralelo;

    // Calcular equivalencias
    const calcular = (): Record<Moneda, number> => {
        let usd = 0;
        switch (monedaOrigen) {
            case 'bs': usd = monto / tarifaUSD; break;
            case 'usd': usd = monto; break;
            case 'eur': usd = monto * tasas.eurUsd; break;
            case 'usdt': usd = monto * tasas.usdtUsd; break;
        }
        return {
            bs: usd * tarifaUSD,
            usd,
            eur: usd / tasas.eurUsd,
            usdt: usd / tasas.usdtUsd,
        };
    };

    const resultados = calcular();

    return (
        <div className="card-sistema">
            <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold">Calculadora de Conversión</h3>
            </div>

            {/* Input de monto */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Monto</label>
                    <input
                        type="number"
                        className="input-sistema font-mono text-lg"
                        value={montoInput}
                        onChange={(e) => setMontoInput(e.target.value)}
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Moneda origen</label>
                    <select
                        className="input-sistema"
                        value={monedaOrigen}
                        onChange={(e) => setMonedaOrigen(e.target.value as Moneda)}
                    >
                        {Object.entries(MONEDAS_INFO).map(([key, info]) => (
                            <option key={key} value={key}>{info.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Selector de tasa */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-muted-foreground">Tasa base:</span>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    {(['bcv', 'paralelo'] as const).map((t) => (
                        <button
                            key={t}
                            className={cn(
                                'px-3 py-1 rounded-md text-xs font-medium transition-all',
                                tasaCalc === t
                                    ? t === 'bcv' ? 'bg-blue-600 text-white' : 'bg-yellow-600 text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => setTasaCalc(t)}
                        >
                            {t === 'bcv' ? 'BCV' : 'Paralela'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Resultados */}
            <div className="grid grid-cols-2 gap-3">
                {(Object.keys(MONEDAS_INFO) as Moneda[]).map((moneda) => {
                    const info = MONEDAS_INFO[moneda];
                    const valor = resultados[moneda];
                    const esMisma = moneda === monedaOrigen;
                    return (
                        <div
                            key={moneda}
                            className={cn(
                                'p-3 rounded-xl border transition-all',
                                esMisma
                                    ? 'border-blue-500/40 bg-blue-500/10'
                                    : 'border-border bg-muted/30'
                            )}
                        >
                            <p className="text-xs text-muted-foreground mb-1">{info.label}</p>
                            <p
                                className="text-lg font-bold font-mono"
                                style={{ color: info.color }}
                            >
                                {moneda === 'bs'
                                    ? formatBs(valor, false)
                                    : moneda === 'usdt'
                                        ? valor.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                                        : valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{info.simbolo}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================
// CALCULADORA DE BRECHA PERSONALIZADA
// ============================
function BrechaPersonalizada() {
    const [tasaA, setTasaA] = useState('40.50');
    const [tasaB, setTasaB] = useState('42.80');
    const [labelA, setLabelA] = useState('Tasa BCV');
    const [labelB, setLabelB] = useState('Tasa Paralela');

    const a = parseFloat(tasaA) || 0;
    const b = parseFloat(tasaB) || 0;
    const brecha = calcularBrecha(Math.max(a, b), Math.min(a, b));
    const diferencia = Math.abs(a - b);

    return (
        <div className="card-sistema">
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold">Calculadora de Brecha Personalizada</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
                Ingresa cualquier dos tasas para calcular la brecha entre ellas
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nombre tasa A</label>
                    <input
                        className="input-sistema text-sm mb-2"
                        value={labelA}
                        onChange={(e) => setLabelA(e.target.value)}
                        placeholder="ej. Tasa BCV"
                    />
                    <label className="text-xs text-muted-foreground mb-1 block">Valor tasa A (Bs/USD)</label>
                    <input
                        type="number"
                        className="input-sistema font-mono"
                        value={tasaA}
                        onChange={(e) => setTasaA(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nombre tasa B</label>
                    <input
                        className="input-sistema text-sm mb-2"
                        value={labelB}
                        onChange={(e) => setLabelB(e.target.value)}
                        placeholder="ej. Paralela"
                    />
                    <label className="text-xs text-muted-foreground mb-1 block">Valor tasa B (Bs/USD)</label>
                    <input
                        type="number"
                        className="input-sistema font-mono"
                        value={tasaB}
                        onChange={(e) => setTasaB(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                    />
                </div>
            </div>

            {/* Resultado de la brecha */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Brecha Calculada</span>
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className={cn(
                    'text-4xl font-bold font-mono mb-2',
                    colorBrecha(brecha)
                )}>
                    {brecha.toFixed(2)}%
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                        <span className="text-blue-400">{labelA}</span>
                        <p className="font-mono text-foreground">{formatBs(a)}/USD</p>
                    </div>
                    <div>
                        <span className="text-yellow-400">{labelB}</span>
                        <p className="font-mono text-foreground">{formatBs(b)}/USD</p>
                    </div>
                    <div className="col-span-2">
                        <span>Diferencia absoluta</span>
                        <p className="font-mono text-foreground font-semibold">{formatBs(diferencia)}/USD</p>
                    </div>
                </div>
            </div>

            {/* Tabla de impacto en ventas */}
            <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Impacto en ventas (vendiendo a tasa A vs tasa B)
                </p>
                <table className="tabla-sistema text-xs">
                    <thead>
                        <tr>
                            <th>Monto USD</th>
                            <th>En Bs ({labelA})</th>
                            <th>En Bs ({labelB})</th>
                            <th>Diferencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[100, 500, 1000, 5000].map((usd) => (
                            <tr key={usd}>
                                <td className="font-mono">${usd}</td>
                                <td className="font-mono text-blue-400">{formatBs(usd * a)}</td>
                                <td className="font-mono text-yellow-400">{formatBs(usd * b)}</td>
                                <td className={cn('font-mono font-semibold', Math.abs(a - b) * usd > 0 ? 'text-green-400' : 'text-red-400')}>
                                    {formatBs(Math.abs(a - b) * usd)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================
// PÁGINA PRINCIPAL DE CAMBIO
// ============================
export default function CambioPage() {
    const { tasas, cargando, refrescar, ultimaActualizacion } = useTasas();
    const [historial, setHistorial] = useState<any[]>([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(true);

    useEffect(() => {
        obtenerHistorialTasas(30).then((data) => {
            setHistorial(data);
            setCargandoHistorial(false);
        });
    }, []);

    const brechaAlta = tasas.brechaUSD > 50;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Tasas de Cambio</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Tasas BCV, paralelo, EUR y USDT en tiempo real
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {ultimaActualizacion && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            Actualizado: {ultimaActualizacion.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    <button onClick={refrescar} disabled={cargando} className="btn-secondary text-sm">
                        <RefreshCw className={cn('w-4 h-4', cargando && 'animate-spin')} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Alerta brecha alta */}
            {brechaAlta && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-pulse">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-red-400">⚠️ Brecha cambiaria elevada</p>
                        <p className="text-xs text-muted-foreground">
                            La brecha supera el 50%. Considera usar la tasa paralela para tus cálculos comerciales.
                        </p>
                    </div>
                </div>
            )}

            {/* ============================
          TASAS ACTUALES
          ============================ */}
            <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Tasas Actuales
                </h2>
                {cargando ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array(4).fill(0).map((_, i) => (
                            <div key={i} className="skeleton h-32 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <TasaCard
                            titulo="Tasa Oficial BCV"
                            valor={`Bs ${tasas.bcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            valorBs="Por 1 USD"
                            fuente="BCV"
                            color="#3b82f6"
                        />
                        <TasaCard
                            titulo="Tasa Paralela"
                            valor={`Bs ${tasas.paralelo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            valorBs="Por 1 USD"
                            fuente="Mercado"
                            color="#f59e0b"
                        />
                        <TasaCard
                            titulo="Dólar en Bs (BCV)"
                            valor={`Bs ${tasas.eurBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            valorBs={`EUR/USD: ${tasas.eurUsd.toFixed(4)}`}
                            fuente="EUR"
                            color="#8b5cf6"
                        />
                        <TasaCard
                            titulo="USDT / Dólar"
                            valor={`$${tasas.usdtUsd.toFixed(4)}`}
                            valorBs={`Bs ${tasas.usdtBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            fuente="USDT"
                            color="#22c55e"
                        />
                    </div>
                )}
            </div>

            {/* ============================
          BRECHA CAMBIARIA
          ============================ */}
            <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Brecha Cambiaria
                </h2>
                {cargando ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array(3).fill(0).map((_, i) => (
                            <div key={i} className="skeleton h-44 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <BrechaCard
                            titulo="Brecha USD"
                            brechaPercent={tasas.brechaUSD}
                            tasaAlta={tasas.paralelo}
                            tasaBaja={tasas.bcv}
                            labelAlta="Paralelo"
                            labelBaja="BCV"
                        />
                        <BrechaCard
                            titulo="Brecha EUR"
                            brechaPercent={tasas.brechaEUR}
                            tasaAlta={tasas.eurParalelo}
                            tasaBaja={tasas.eurBcv}
                            labelAlta="EUR Paralelo"
                            labelBaja="EUR BCV"
                        />
                        <BrechaCard
                            titulo="Brecha USDT"
                            brechaPercent={tasas.brechaUSDT}
                            tasaAlta={tasas.usdtBs}
                            tasaBaja={tasas.bcv * tasas.usdtUsd}
                            labelAlta="USDT en Bs"
                            labelBaja="BCV × USDT"
                        />
                    </div>
                )}
            </div>

            {/* ============================
          HERRAMIENTAS DE CÁLCULO
          ============================ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CalculadoraConversion tasas={tasas} />
                <BrechaPersonalizada />
            </div>

            {/* ============================
          GRÁFICA HISTÓRICA
          ============================ */}
            <div className="card-sistema">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold">Historial de Tasas y Brecha</h3>
                        <p className="text-xs text-muted-foreground">Últimos 30 días</p>
                    </div>
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </div>

                {cargandoHistorial ? (
                    <div className="skeleton h-72 w-full rounded-lg" />
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={historial} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                            <XAxis
                                dataKey="fecha"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => v.slice(5)}
                                interval={4}
                            />
                            <YAxis
                                yAxisId="tasa"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `${v.toFixed(1)}`}
                            />
                            <YAxis
                                yAxisId="brecha"
                                orientation="right"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `${v.toFixed(1)}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <ReferenceLine yAxisId="brecha" y={50} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '50%', fill: '#ef4444', fontSize: 10 }} />
                            <Line yAxisId="tasa" type="monotone" dataKey="bcv" name="BCV" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            <Line yAxisId="tasa" type="monotone" dataKey="paralelo" name="Paralelo" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            <Line yAxisId="brecha" type="monotone" dataKey="brecha" name="Brecha %" stroke="#ef4444" strokeWidth={1.5} dot={false} opacity={0.7} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
