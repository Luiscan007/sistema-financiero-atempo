'use client';

/**
 * app/configuracion/page.tsx
 * Configuración completa del negocio y del sistema
 */

import { useState } from 'react';
import {
    Building2, Smartphone, CreditCard, DollarSign, Settings,
    Save, RefreshCw, User, Key, Bell, Palette, Shield,
    CheckCircle2, Upload, MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfigStore } from '@/lib/store';
import { useTasas } from '@/components/providers/TasasProvider';
import { BANCOS_VENEZOLANOS } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Sección de configuración
function SeccionConfig({ titulo, icono: Icono, children }: {
    titulo: string;
    icono: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <div className="card-sistema">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Icono className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="font-semibold">{titulo}</h3>
            </div>
            {children}
        </div>
    );
}

export default function ConfiguracionPage() {
    const { config, setConfig } = useConfigStore();
    const { tasas, refrescar, cargando } = useTasas();

    // Estados locales de formularios
    const [negocio, setNegocio] = useState({
        nombre: config.nombre || 'Mi Negocio',
        rif: config.rif || 'J-00000000-0',
        direccion: config.direccion || 'Caracas, Venezuela',
        telefono: config.telefono || '0212-000-0000',
        whatsapp: config.whatsapp || '',
        pieDeRecibo: config.pieDeRecibo || 'Gracias por su compra.',
    });

    const [bancosConfig, setBancosConfig] = useState({
        bancoPagoMovil: config.bancoPagoMovil || '',
        telefonoPagoMovil: config.telefonoPagoMovil || '',
        titularPagoMovil: config.titularPagoMovil || '',
        numeroPOS: config.numeroPOS || '',
        bancoPOS: config.bancoPOS || '',
    });

    const [preferencias, setPreferencias] = useState({
        monedaPrincipal: config.monedaPrincipal || 'bs',
        tasaPreferida: config.tasaPreferida || 'bcv',
    });

    const [tasasManual, setTasasManual] = useState({
        usarManual: false,
        tasaBCV: '',
        tasaParalelo: '',
    });

    const guardarNegocio = () => {
        setConfig(negocio);
        toast.success('Datos del negocio guardados ✓');
    };

    const guardarBancos = () => {
        setConfig(bancosConfig);
        toast.success('Datos bancarios guardados ✓');
    };

    const guardarPreferencias = () => {
        setConfig(preferencias);
        toast.success('Preferencias guardadas ✓');
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Configuración</h1>
                <p className="text-muted-foreground text-sm">Configura tu negocio y las preferencias del sistema</p>
            </div>

            {/* ============================
          1. DATOS DEL NEGOCIO
          ============================ */}
            <SeccionConfig titulo="Datos del Negocio" icono={Building2}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Nombre Comercial *</label>
                        <input
                            className="input-sistema"
                            value={negocio.nombre}
                            onChange={(e) => setNegocio({ ...negocio, nombre: e.target.value })}
                            placeholder="Nombre de tu negocio"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">RIF</label>
                        <input
                            className="input-sistema font-mono"
                            value={negocio.rif}
                            onChange={(e) => setNegocio({ ...negocio, rif: e.target.value })}
                            placeholder="J-XXXXXXXX-X"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                        <input
                            type="tel"
                            className="input-sistema"
                            value={negocio.telefono}
                            onChange={(e) => setNegocio({ ...negocio, telefono: e.target.value })}
                            placeholder="0212-XXX-XXXX"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
                        <input
                            className="input-sistema"
                            value={negocio.direccion}
                            onChange={(e) => setNegocio({ ...negocio, direccion: e.target.value })}
                            placeholder="Dirección del negocio"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-green-400" />
                            WhatsApp (para recibos)
                        </label>
                        <input
                            type="tel"
                            className="input-sistema"
                            value={negocio.whatsapp}
                            onChange={(e) => setNegocio({ ...negocio, whatsapp: e.target.value })}
                            placeholder="04XX-XXX-XXXX"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Pie de página del recibo</label>
                        <textarea
                            className="input-sistema resize-none"
                            rows={3}
                            value={negocio.pieDeRecibo}
                            onChange={(e) => setNegocio({ ...negocio, pieDeRecibo: e.target.value })}
                            placeholder="Texto para el pie de página de los recibos..."
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Logo del negocio</label>
                        <div className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-muted border border-border rounded-xl flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <button className="btn-secondary text-sm">
                                <Upload className="w-4 h-4" />
                                Subir logo
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                    <button className="btn-primary" onClick={guardarNegocio}>
                        <Save className="w-4 h-4" /> Guardar
                    </button>
                </div>
            </SeccionConfig>

            {/* ============================
          2. DATOS BANCARIOS
          ============================ */}
            <SeccionConfig titulo="Datos Bancarios" icono={CreditCard}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pago Móvil */}
                    <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-green-400" />
                            Cuenta Pago Móvil
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Banco</label>
                                <select
                                    className="input-sistema"
                                    value={bancosConfig.bancoPagoMovil}
                                    onChange={(e) => setBancosConfig({ ...bancosConfig, bancoPagoMovil: e.target.value })}
                                >
                                    <option value="">Seleccionar banco...</option>
                                    {BANCOS_VENEZOLANOS.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Teléfono registrado</label>
                                <input
                                    type="tel"
                                    className="input-sistema"
                                    value={bancosConfig.telefonoPagoMovil}
                                    onChange={(e) => setBancosConfig({ ...bancosConfig, telefonoPagoMovil: e.target.value })}
                                    placeholder="04XX-XXX-XXXX"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Nombre del titular</label>
                                <input
                                    className="input-sistema"
                                    value={bancosConfig.titularPagoMovil}
                                    onChange={(e) => setBancosConfig({ ...bancosConfig, titularPagoMovil: e.target.value })}
                                    placeholder="Nombre completo"
                                />
                            </div>
                        </div>
                    </div>

                    {/* POS Físico */}
                    <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-blue-400" />
                            Terminal POS Físico
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Banco adquirente</label>
                                <select
                                    className="input-sistema"
                                    value={bancosConfig.bancoPOS}
                                    onChange={(e) => setBancosConfig({ ...bancosConfig, bancoPOS: e.target.value })}
                                >
                                    <option value="">Seleccionar banco...</option>
                                    {BANCOS_VENEZOLANOS.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Número de terminal</label>
                                <input
                                    className="input-sistema font-mono"
                                    value={bancosConfig.numeroPOS}
                                    onChange={(e) => setBancosConfig({ ...bancosConfig, numeroPOS: e.target.value })}
                                    placeholder="12345678"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                    <button className="btn-primary" onClick={guardarBancos}>
                        <Save className="w-4 h-4" /> Guardar
                    </button>
                </div>
            </SeccionConfig>

            {/* ============================
          3. PREFERENCIAS
          ============================ */}
            <SeccionConfig titulo="Preferencias del Sistema" icono={Settings}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Moneda principal de visualización</label>
                        <select
                            className="input-sistema"
                            value={preferencias.monedaPrincipal}
                            onChange={(e) => setPreferencias({ ...preferencias, monedaPrincipal: e.target.value as any })}
                        >
                            <option value="bs">Bolívar (Bs)</option>
                            <option value="usd">Dólar (USD)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Tasa preferida para cálculos</label>
                        <select
                            className="input-sistema"
                            value={preferencias.tasaPreferida}
                            onChange={(e) => setPreferencias({ ...preferencias, tasaPreferida: e.target.value as any })}
                        >
                            <option value="bcv">Tasa BCV oficial</option>
                            <option value="paralelo">Tasa paralela</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                    <button className="btn-primary" onClick={guardarPreferencias}>
                        <Save className="w-4 h-4" /> Guardar preferencias
                    </button>
                </div>
            </SeccionConfig>

            {/* ============================
          4. TASAS DE CAMBIO
          ============================ */}
            <SeccionConfig titulo="Tasas de Cambio" icono={DollarSign}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {[
                        { label: 'BCV', valor: `Bs ${tasas.bcv.toFixed(2)}`, color: 'text-blue-400' },
                        { label: 'Paralelo', valor: `Bs ${tasas.paralelo.toFixed(2)}`, color: 'text-yellow-400' },
                        { label: 'EUR/BCV', valor: `Bs ${tasas.eurBcv.toFixed(2)}`, color: 'text-purple-400' },
                        { label: 'USDT', valor: `$${tasas.usdtUsd.toFixed(4)}`, color: 'text-green-400' },
                    ].map((t) => (
                        <div key={t.label} className="bg-muted/30 border border-border rounded-xl p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{t.label}</p>
                            <p className={cn('font-bold font-mono', t.color)}>{t.valor}</p>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted/20 border border-border rounded-xl">
                    <div
                        className={cn(
                            'w-10 h-6 rounded-full cursor-pointer transition-colors flex items-center px-0.5',
                            tasasManual.usarManual ? 'bg-blue-500 justify-end' : 'bg-muted justify-start'
                        )}
                        onClick={() => setTasasManual({ ...tasasManual, usarManual: !tasasManual.usarManual })}
                    >
                        <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Override de tasas manual</p>
                        <p className="text-xs text-muted-foreground">
                            Usa tasas personalizadas en lugar del scraping automático
                        </p>
                    </div>
                </div>

                {tasasManual.usarManual && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Tasa BCV manual (Bs/USD)</label>
                            <input
                                type="number"
                                className="input-sistema font-mono"
                                value={tasasManual.tasaBCV}
                                onChange={(e) => setTasasManual({ ...tasasManual, tasaBCV: e.target.value })}
                                placeholder={tasas.bcv.toFixed(2)}
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Tasa Paralela manual (Bs/USD)</label>
                            <input
                                type="number"
                                className="input-sistema font-mono"
                                value={tasasManual.tasaParalelo}
                                onChange={(e) => setTasasManual({ ...tasasManual, tasaParalelo: e.target.value })}
                                placeholder={tasas.paralelo.toFixed(2)}
                                step="0.01"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-between mt-4">
                    <button
                        className="btn-secondary text-sm"
                        onClick={refrescar}
                        disabled={cargando}
                    >
                        <RefreshCw className={cn('w-4 h-4', cargando && 'animate-spin')} />
                        Actualizar tasas ahora
                    </button>
                    {tasasManual.usarManual && (
                        <button className="btn-primary text-sm">
                            <Save className="w-4 h-4" /> Aplicar tasas manuales
                        </button>
                    )}
                </div>
            </SeccionConfig>

            {/* ============================
          5. SEGURIDAD
          ============================ */}
            <SeccionConfig titulo="Seguridad y Acceso" icono={Shield}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
                        <div className="flex items-center gap-3">
                            <Key className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Autenticación de dos factores</p>
                                <p className="text-xs text-muted-foreground">Añade seguridad extra a tu cuenta</p>
                            </div>
                        </div>
                        <div className="w-10 h-6 rounded-full bg-muted flex items-center px-0.5 cursor-pointer">
                            <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Notificaciones de inicio de sesión</p>
                                <p className="text-xs text-muted-foreground">Recibe alertas cuando alguien acceda al sistema</p>
                            </div>
                        </div>
                        <div className="w-10 h-6 rounded-full bg-blue-500 flex items-center justify-end px-0.5 cursor-pointer">
                            <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                        </div>
                    </div>
                </div>
            </SeccionConfig>
        </div>
    );
}
