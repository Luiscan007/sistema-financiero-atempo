'use client';

/**
 * components/ui/PanelNotificaciones.tsx
 * Panel lateral de notificaciones con animacion y tiempo real
 */

import { useEffect, useRef } from 'react';
import {
    X, Bell, ShoppingCart, AlertTriangle, Info,
    Settings, CheckCheck, Package, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificaciones } from '@/lib/useNotificaciones';
import type { Notificacion, TipoNotif } from '@/lib/useNotificaciones';

/* ── Config visual por tipo ─────────────────────────── */
const TIPO_CONFIG: Record<TipoNotif, {
    icon:    React.ElementType;
    color:   string;
    bg:      string;
    dot:     string;
    label:   string;
}> = {
    venta:   { icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/12 border-emerald-500/20', dot: 'bg-emerald-400', label: 'Venta' },
    alerta:  { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/12 border-amber-500/20',    dot: 'bg-amber-400',   label: 'Alerta' },
    sistema: { icon: Settings,      color: 'text-blue-400',   bg: 'bg-blue-500/12 border-blue-500/20',      dot: 'bg-blue-400',    label: 'Sistema' },
    info:    { icon: Info,          color: 'text-purple-400', bg: 'bg-purple-500/12 border-purple-500/20',  dot: 'bg-purple-400',  label: 'Info' },
};

interface Props {
    abierto:  boolean;
    onCerrar: () => void;
}

export default function PanelNotificaciones({ abierto, onCerrar }: Props) {
    const { notifs, noLeidas, cargando, marcarLeida, marcarTodasLeidas } = useNotificaciones();
    const panelRef = useRef<HTMLDivElement>(null);

    // Cerrar con Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
        if (abierto) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [abierto, onCerrar]);

    // Cerrar al click fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onCerrar();
            }
        };
        if (abierto) setTimeout(() => document.addEventListener('mousedown', handler), 100);
        return () => document.removeEventListener('mousedown', handler);
    }, [abierto, onCerrar]);

    return (
        <>
            {/* Overlay difuminado */}
            <div
                className={cn(
                    'fixed inset-0 z-40 transition-all duration-300',
                    abierto ? 'bg-black/30 backdrop-blur-[2px] pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                onClick={onCerrar}
            />

            {/* Panel lateral */}
            <div
                ref={panelRef}
                className={cn(
                    'fixed top-0 right-0 h-full w-full max-w-sm z-50',
                    'flex flex-col shadow-2xl',
                    'transition-transform duration-300 ease-out',
                    'bg-card border-l border-border',
                    abierto ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                            <Bell className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm text-foreground">Notificaciones</h2>
                            <p className="text-xs text-muted-foreground">
                                {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo al dia'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {noLeidas > 0 && (
                            <button
                                onClick={marcarTodasLeidas}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                                title="Marcar todas como leidas"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Leer todas
                            </button>
                        )}
                        <button
                            onClick={onCerrar}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto">
                    {cargando ? (
                        <div className="p-5 space-y-3">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="flex gap-3">
                                    <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="skeleton h-3.5 w-3/4 rounded" />
                                        <div className="skeleton h-3 w-full rounded" />
                                        <div className="skeleton h-2.5 w-1/3 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                                <Bell className="w-7 h-7 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Sin notificaciones</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Las ventas y alertas apareceran aqui
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/60">
                            {notifs.map((n, idx) => (
                                <NotifItem
                                    key={n.id}
                                    notif={n}
                                    onLeer={() => marcarLeida(n.id)}
                                    delay={idx * 30}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifs.length > 0 && (
                    <div className="px-5 py-3 border-t border-border flex-shrink-0">
                        <p className="text-xs text-center text-muted-foreground">
                            {notifs.length} notificacion{notifs.length !== 1 ? 'es' : ''} en total
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

/* ── Item individual ─────────────────────────────────── */
function NotifItem({
    notif, onLeer, delay,
}: {
    notif:  Notificacion;
    onLeer: () => void;
    delay:  number;
}) {
    const cfg  = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.info;
    const Icon = cfg.icon;

    return (
        <div
            className={cn(
                'flex gap-3 px-4 py-3.5 transition-all duration-200 cursor-pointer group',
                notif.leida
                    ? 'opacity-55 hover:opacity-80'
                    : 'hover:bg-muted/40'
            )}
            style={{ animationDelay: `${delay}ms` }}
            onClick={() => { if (!notif.leida) onLeer(); }}
        >
            {/* Icono tipo */}
            <div className={cn(
                'w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5',
                cfg.bg
            )}>
                <Icon className={cn('w-4 h-4', cfg.color)} />
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        'text-sm leading-snug',
                        notif.leida ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground'
                    )}>
                        {notif.titulo}
                    </p>
                    {/* Dot no leida */}
                    {!notif.leida && (
                        <Circle className={cn('w-2 h-2 flex-shrink-0 mt-1.5 fill-current', cfg.color)} />
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                    {notif.mensaje}
                </p>

                {/* Meta extra para ventas */}
                {notif.tipo === 'venta' && notif.meta?.numeroRecibo && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/15 text-[11px] text-emerald-400 font-mono">
                        {notif.meta.numeroRecibo}
                    </span>
                )}

                <p className="text-[11px] text-muted-foreground/50 mt-1.5">{notif.fecha}</p>
            </div>
        </div>
    );
}
