'use client';

/**
 * components/layout/AppLayout.tsx
 * Layout principal con sidebar, topbar y toggle de tema claro/oscuro
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, ShoppingCart, Package, Receipt,
    TrendingUp, BookOpen, Users, Settings, DollarSign,
    ChevronLeft, ChevronRight, LogOut, Bell, RefreshCw,
    Menu, X, Activity, AlertTriangle, WifiOff, Sun, Moon,
} from 'lucide-react';
import PanelNotificaciones from '@/components/ui/PanelNotificaciones';
import { useNotificaciones } from '@/lib/useNotificaciones';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTasas } from '@/components/providers/TasasProvider';
import { formatBs, formatUSD, colorBrecha, nivelBrecha } from '@/lib/utils';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
    {
        titulo: 'Principal',
        items: [
            { label: 'Dashboard',      href: '/dashboard',    icon: LayoutDashboard },
            { label: 'Punto de Venta', href: '/pos',          icon: ShoppingCart },
        ],
    },
    {
        titulo: 'Gestion',
        items: [
            { label: 'Inventario',    href: '/inventario',   icon: Package },
            { label: 'Ventas',        href: '/ventas',       icon: Receipt },
            { label: 'Gastos',        href: '/gastos',       icon: TrendingUp },
            { label: 'Contabilidad',  href: '/contabilidad', icon: BookOpen },
        ],
    },
    {
        titulo: 'Finanzas',
        items: [
            { label: 'Tasas y Cambio', href: '/cambio',      icon: DollarSign },
            { label: 'Clientes',       href: '/clientes',    icon: Users },
        ],
    },
    {
        titulo: 'Sistema',
        items: [
            { label: 'Configuracion', href: '/configuracion', icon: Settings },
        ],
    },
];

interface AppLayoutProps { children: React.ReactNode; }

// Hook para persisitir tema en localStorage
function useTema() {
    const [tema, setTema] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const guardado = localStorage.getItem('atempo-tema') as 'dark' | 'light' | null;
        if (guardado) setTema(guardado);
    }, []);

    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('dark', 'light');
        html.classList.add(tema);
        localStorage.setItem('atempo-tema', tema);
    }, [tema]);

    const toggleTema = () => setTema(t => t === 'dark' ? 'light' : 'dark');
    return { tema, toggleTema };
}

export default function AppLayout({ children }: AppLayoutProps) {
    const [sidebarAbierto, setSidebarAbierto] = useState(true);
    const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);
    const [online, setOnline] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const { perfil, logout } = useAuth();
    const { tasas, cargando: cargandoTasas, refrescar, ultimaActualizacion } = useTasas();
    const { tema, toggleTema } = useTema();
    const [panelNotifAbierto, setPanelNotifAbierto] = useState(false);
    const { noLeidas } = useNotificaciones();

    useEffect(() => {
        const handleOnline  = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener('online',  handleOnline);
        window.addEventListener('offline', handleOffline);
        setOnline(navigator.onLine);
        return () => {
            window.removeEventListener('online',  handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/auth');
    };

    const brechaAlta = tasas.brechaUSD > 50;

    // Sidebar compartido (desktop + mobile)
    const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
        <>
            {/* Logo */}
            <div className={cn(
                'flex items-center border-b border-white/10 flex-shrink-0',
                mobile || sidebarAbierto ? 'justify-between p-4' : 'justify-center p-3'
            )}>
                {(mobile || sidebarAbierto) ? (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white tracking-wide">ATEMPO</p>
                            <p className="text-[11px] text-white/40 font-medium">Sistema Financiero</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                )}
                {mobile ? (
                    <button onClick={() => setMobileMenuAbierto(false)}
                        className="text-white/40 hover:text-white/80 p-1 rounded-lg hover:bg-white/10 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                ) : sidebarAbierto ? (
                    <button onClick={() => setSidebarAbierto(false)}
                        className="text-white/30 hover:text-white/70 p-1 rounded-lg hover:bg-white/10 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                ) : (
                    <button onClick={() => setSidebarAbierto(true)}
                        className="text-white/30 hover:text-white/70 p-1 rounded-lg hover:bg-white/10 transition-all -mr-1">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 no-scrollbar">
                {NAV_ITEMS.map((grupo) => (
                    <div key={grupo.titulo} className="mb-3">
                        {(mobile || sidebarAbierto) && (
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 py-1.5 mb-0.5">
                                {grupo.titulo}
                            </p>
                        )}
                        {!mobile && !sidebarAbierto && (
                            <div className="border-t border-white/10 my-2" />
                        )}
                        {grupo.items.map((item) => {
                            const activo = pathname.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => mobile && setMobileMenuAbierto(false)}
                                    className={cn(
                                        'sidebar-link',
                                        activo && 'active',
                                        !mobile && !sidebarAbierto && 'justify-center px-2'
                                    )}
                                    title={(!mobile && !sidebarAbierto) ? item.label : undefined}
                                >
                                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                                    {(mobile || sidebarAbierto) && (
                                        <span>{item.label}</span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer sidebar */}
            <div className="p-3 border-t border-white/10 space-y-1 flex-shrink-0">
                {!online && (
                    <div className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20',
                        !mobile && !sidebarAbierto && 'justify-center px-2'
                    )}>
                        <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        {(mobile || sidebarAbierto) && <span className="text-xs text-amber-400">Sin conexion</span>}
                    </div>
                )}
                {perfil && (
                    <div className={cn(
                        'flex items-center gap-3 px-3 py-2',
                        !mobile && !sidebarAbierto && 'justify-center'
                    )}>
                        <div className="w-8 h-8 rounded-full bg-blue-500/25 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-300">
                                {perfil.nombre.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        {(mobile || sidebarAbierto) && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white/90 truncate">{perfil.nombre}</p>
                                <p className="text-[11px] text-white/35 capitalize">{perfil.rol}</p>
                            </div>
                        )}
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-white/35 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-medium',
                        !mobile && !sidebarAbierto && 'justify-center px-2'
                    )}
                    title="Cerrar sesion"
                >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {(mobile || sidebarAbierto) && <span>Cerrar sesion</span>}
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-background overflow-hidden">

            {/* SIDEBAR DESKTOP */}
            <aside className={cn(
                'hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out',
                'bg-[hsl(var(--sidebar-bg))]',
                sidebarAbierto ? 'w-60' : 'w-[60px]'
            )}>
                <SidebarContent />
            </aside>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* TOP BAR */}
                <header className="bg-[hsl(var(--topbar-bg))] border-b border-border px-4 py-2.5 flex items-center gap-3 flex-shrink-0">

                    {/* Boton menu movil */}
                    <button
                        className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-all"
                        onClick={() => setMobileMenuAbierto(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Widget tasas */}
                    <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        {cargandoTasas ? (
                            <div className="flex gap-2">
                                {[1,2,3,4].map(i => <div key={i} className="skeleton h-7 w-28 rounded-lg" />)}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 flex-nowrap">
                                <div className="tasa-widget">
                                    <span className="text-muted-foreground text-xs">BCV</span>
                                    <span className="text-blue-400 font-semibold">
                                        Bs {tasas.bcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="tasa-widget">
                                    <span className="text-muted-foreground text-xs">Paralelo</span>
                                    <span className="text-amber-400 font-semibold">
                                        Bs {tasas.paralelo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className={cn('tasa-widget', brechaAlta && 'border-red-500/40 bg-red-500/10 animate-pulse')}>
                                    <span className="text-muted-foreground text-xs">Brecha</span>
                                    <span className={cn('font-semibold',
                                        tasas.brechaUSD > 50 ? 'text-red-400' :
                                        tasas.brechaUSD > 20 ? 'text-amber-400' : 'text-emerald-400')}>
                                        {tasas.brechaUSD.toFixed(1)}%
                                    </span>
                                    {brechaAlta && <AlertTriangle className="w-3 h-3 text-red-400" />}
                                </div>
                                <div className="tasa-widget">
                                    <span className="text-muted-foreground text-xs">USDT</span>
                                    <span className="text-emerald-400 font-semibold">${tasas.usdtUsd.toFixed(4)}</span>
                                </div>
                                <div className="tasa-widget hidden xl:flex">
                                    <span className="text-muted-foreground text-xs">EUR</span>
                                    <span className="text-purple-400 font-semibold">
                                        Bs {tasas.eurBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {ultimaActualizacion && (
                                    <div className="tasa-widget hidden md:flex">
                                        <span className="text-muted-foreground text-xs">
                                            {ultimaActualizacion.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Acciones derecha */}
                    <div className="flex items-center gap-1 flex-shrink-0">

                        {/* Indicador online */}
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                            online ? 'bg-emerald-400' : 'bg-amber-400')}
                            title={online ? 'En linea' : 'Sin conexion'} />

                        {/* Refrescar tasas */}
                        <button onClick={refrescar} disabled={cargandoTasas}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                            title="Actualizar tasas">
                            <RefreshCw className={cn('w-4 h-4', cargandoTasas && 'animate-spin')} />
                        </button>

                        {/* TOGGLE TEMA */}
                        <button
                            onClick={toggleTema}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all relative group"
                            title={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        >
                            {tema === 'dark' ? (
                                <Sun className="w-4 h-4 transition-transform group-hover:rotate-45 group-hover:scale-110" />
                            ) : (
                                <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
                            )}
                        </button>

                        {/* Notificaciones */}
                        <button
                            onClick={() => setPanelNotifAbierto(true)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all relative"
                            title="Notificaciones"
                        >
                            <Bell className="w-4 h-4" />
                            {noLeidas > 0 && (
                                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none animate-pulse">
                                    {noLeidas > 9 ? '9+' : noLeidas}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* Pagina */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>

            {/* PANEL NOTIFICACIONES */}
            <PanelNotificaciones
                abierto={panelNotifAbierto}
                onCerrar={() => setPanelNotifAbierto(false)}
            />

            {/* SIDEBAR MOVIL */}
            {mobileMenuAbierto && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setMobileMenuAbierto(false)} />
                    <aside className="relative w-72 flex flex-col animate-slide-in bg-[hsl(220_20%_9%)]">
                        <SidebarContent mobile />
                    </aside>
                </div>
            )}
        </div>
    );
}
