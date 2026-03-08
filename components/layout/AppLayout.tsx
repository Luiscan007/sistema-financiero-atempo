'use client';

/**
 * components/layout/AppLayout.tsx
 * Layout principal del sistema con sidebar colapsable y top bar
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Receipt,
    TrendingUp,
    BookOpen,
    Users,
    Settings,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Bell,
    RefreshCw,
    Menu,
    X,
    Activity,
    AlertTriangle,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTasas } from '@/components/providers/TasasProvider';
import { formatBs, formatUSD, colorBrecha, nivelBrecha } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Items del sidebar
const NAV_ITEMS = [
    {
        titulo: 'Principal',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, modulo: 'dashboard' },
            { label: 'Punto de Venta', href: '/pos', icon: ShoppingCart, modulo: 'pos' },
        ],
    },
    {
        titulo: 'Gestión',
        items: [
            { label: 'Inventario', href: '/inventario', icon: Package, modulo: 'inventario' },
            { label: 'Ventas', href: '/ventas', icon: Receipt, modulo: 'ventas' },
            { label: 'Gastos', href: '/gastos', icon: TrendingUp, modulo: 'gastos' },
            { label: 'Contabilidad', href: '/contabilidad', icon: BookOpen, modulo: 'contabilidad' },
        ],
    },
    {
        titulo: 'Finanzas',
        items: [
            { label: 'Tasas y Cambio', href: '/cambio', icon: DollarSign, modulo: 'cambio' },
            { label: 'Clientes', href: '/clientes', icon: Users, modulo: 'clientes' },
        ],
    },
    {
        titulo: 'Sistema',
        items: [
            { label: 'Configuración', href: '/configuracion', icon: Settings, modulo: 'configuracion' },
        ],
    },
];

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const [sidebarAbierto, setSidebarAbierto] = useState(true);
    const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);
    const [online, setOnline] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const { usuario, perfil, cargando: cargandoAuth, logout } = useAuth();
    const { tasas, cargando: cargandoTasas, refrescar, ultimaActualizacion } = useTasas();

    // Detectar conexión online/offline
    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // GUARDIA DE AUTENTICACION - redirige si no hay sesion
    useEffect(() => {
        if (!cargando && !usuario) {
            router.replace('/auth');
        }
    }, [usuario, cargando, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/auth');
    };

    const brechaAlta = tasas.brechaUSD > 50;

    // Pantalla de carga mientras Firebase verifica la sesion
    if (cargandoAuth) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Verificando sesion...</p>
                </div>
            </div>
        );
    }

    // Si no hay usuario tras cargar, no renderizar nada (el useEffect redirige)
    if (!usuario) return null;

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* ============================
          SIDEBAR DESKTOP
          ============================ */}
            <aside
                className={cn(
                    'hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out flex-shrink-0',
                    sidebarAbierto ? 'w-64' : 'w-16'
                )}
            >
                {/* Logo / Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    {sidebarAbierto && (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                                <Activity className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">ATEMPO</p>
                                <p className="text-xs text-muted-foreground">Sistema Financiero</p>
                            </div>
                        </div>
                    )}
                    {!sidebarAbierto && (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center mx-auto">
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarAbierto(!sidebarAbierto)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                        title={sidebarAbierto ? 'Colapsar sidebar' : 'Expandir sidebar'}
                    >
                        {sidebarAbierto ? (
                            <ChevronLeft className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Navegación */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {NAV_ITEMS.map((grupo) => (
                        <div key={grupo.titulo} className="mb-4">
                            {sidebarAbierto && (
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                                    {grupo.titulo}
                                </p>
                            )}
                            {grupo.items.map((item) => {
                                const activo = pathname.startsWith(item.href);
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'sidebar-link',
                                            activo && 'active',
                                            !sidebarAbierto && 'justify-center px-2'
                                        )}
                                        title={!sidebarAbierto ? item.label : undefined}
                                    >
                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                        {sidebarAbierto && (
                                            <span className="text-sm font-medium">{item.label}</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Footer del sidebar */}
                <div className="p-3 border-t border-border space-y-2">
                    {/* Indicador offline */}
                    {!online && (
                        <div className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30',
                            !sidebarAbierto && 'justify-center px-2'
                        )}>
                            <WifiOff className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            {sidebarAbierto && <span className="text-xs text-yellow-400">Modo offline</span>}
                        </div>
                    )}

                    {/* Info del usuario */}
                    {perfil && (
                        <div className={cn(
                            'flex items-center gap-3 px-3 py-2',
                            !sidebarAbierto && 'justify-center'
                        )}>
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-blue-400">
                                    {perfil.nombre.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            {sidebarAbierto && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{perfil.nombre}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{perfil.rol}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200',
                            !sidebarAbierto && 'justify-center px-2'
                        )}
                        title="Cerrar sesión"
                    >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        {sidebarAbierto && <span className="text-sm">Cerrar sesión</span>}
                    </button>
                </div>
            </aside>

            {/* ============================
          CONTENIDO PRINCIPAL
          ============================ */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* TOP BAR con Widget de Tasas */}
                <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
                    {/* Botón menú móvil */}
                    <button
                        className="lg:hidden text-muted-foreground hover:text-foreground"
                        onClick={() => setMobileMenuAbierto(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Widget de Tasas - SIEMPRE VISIBLE */}
                    <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {cargandoTasas ? (
                            // Skeleton mientras carga
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="skeleton h-7 w-32 rounded-lg" />
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-nowrap">
                                {/* BCV */}
                                <div className="tasa-widget">
                                    <span className="text-muted-foreground text-xs">BCV</span>
                                    <span className="text-blue-400 font-semibold">
                                        Bs {tasas.bcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {/* Paralelo */}
                                <div className="tasa-widget">
                                    <span className="text-muted-foreground text-xs">Paralelo</span>
                                    <span className="text-yellow-400 font-semibold">
                                        Bs {tasas.paralelo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {/* Brecha - Parpadea si > 50% */}
                                <div className={cn(
                                    'tasa-widget',
                                    brechaAlta && 'animate-pulse border-red-500/40 bg-red-500/10'
                                )}>
                                    <span className="text-muted-foreground text-xs">Brecha</span>
                                    <span className={cn(
                                        'font-semibold',
                                        tasas.brechaUSD > 50 ? 'text-red-500' : tasas.brechaUSD > 20 ? 'text-yellow-400' : 'text-green-400'
                                    )}>
                                        {tasas.brechaUSD.toFixed(1)}%
                                    </span>
                                    {brechaAlta && (
                                        <AlertTriangle className="w-3 h-3 text-red-400" />
                                    )}
                                </div>

                                {/* USDT */}
                                <div className="tasa-widget">
                                    <span className="text-muted-foreground text-xs">USDT</span>
                                    <span className="text-green-400 font-semibold">
                                        ${tasas.usdtUsd.toFixed(4)}
                                    </span>
                                </div>

                                {/* EUR */}
                                <div className="tasa-widget hidden xl:flex">
                                    <span className="text-muted-foreground text-xs">EUR/BCV</span>
                                    <span className="text-purple-400 font-semibold">
                                        Bs {tasas.eurBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {/* Última actualización */}
                                {ultimaActualizacion && (
                                    <div className="tasa-widget hidden md:flex text-muted-foreground">
                                        <span className="text-xs">
                                            {ultimaActualizacion.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Indicador online */}
                        <div className={cn(
                            'w-2 h-2 rounded-full',
                            online ? 'bg-green-400' : 'bg-yellow-400'
                        )} title={online ? 'En línea' : 'Sin conexión'} />

                        {/* Refrescar tasas */}
                        <button
                            onClick={refrescar}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-white/5 rounded-lg"
                            title="Actualizar tasas"
                            disabled={cargandoTasas}
                        >
                            <RefreshCw className={cn('w-4 h-4', cargandoTasas && 'animate-spin')} />
                        </button>

                        {/* Notificaciones */}
                        <button className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-white/5 rounded-lg relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                        </button>
                    </div>
                </header>

                {/* Contenido de la página */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>

            {/* ============================
          SIDEBAR MÓVIL (overlay)
          ============================ */}
            {mobileMenuAbierto && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    {/* Overlay oscuro */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setMobileMenuAbierto(false)}
                    />

                    {/* Sidebar móvil */}
                    <aside className="relative w-72 bg-card border-r border-border flex flex-col animate-slide-in">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">ATEMPO</p>
                                    <p className="text-xs text-muted-foreground">Sistema Financiero</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMobileMenuAbierto(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Nav */}
                        <nav className="flex-1 overflow-y-auto p-3">
                            {NAV_ITEMS.map((grupo) => (
                                <div key={grupo.titulo} className="mb-4">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                                        {grupo.titulo}
                                    </p>
                                    {grupo.items.map((item) => {
                                        const activo = pathname.startsWith(item.href);
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileMenuAbierto(false)}
                                                className={cn('sidebar-link', activo && 'active')}
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span className="text-sm font-medium">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ))}
                        </nav>

                        {/* Footer */}
                        <div className="p-3 border-t border-border">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="text-sm">Cerrar sesión</span>
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
