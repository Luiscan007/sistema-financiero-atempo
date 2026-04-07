'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, ShoppingCart, Receipt,
    TrendingUp, BookOpen, Settings, DollarSign,
    ChevronLeft, ChevronRight, LogOut, Bell, RefreshCw,
    Menu, X, AlertTriangle, GraduationCap, ClipboardList, 
    Wallet, CalendarDays, LayoutGrid, Scale, MessageSquare, 
    Boxes, Layers, Handshake, BarChart2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTasas } from '@/components/providers/TasasProvider';
import { cn } from '@/lib/utils';
import { tienePermiso, RUTA_INICIO_ROL, RolUsuario } from '@/lib/roles';
import { InternalChatPanel, useChatNoLeidos } from '@/components/chat/InternalChatPanel';

// ─── Navegación (Con Lucide afinado a estilo Coolicons) ─────────────────────────

const NAV_ITEMS = [
    {
        titulo: 'MAIN',
        items: [
            { label: 'Dashboard',      href: '/dashboard', icon: LayoutDashboard },
            { label: 'Punto de Venta', href: '/pos',       icon: ShoppingCart    },
            { label: 'Estudio en Vivo', href: '/estudio',  icon: LayoutGrid      },
        ],
    },
    {
        titulo: 'ACADEMIA',
        items: [
            { label: 'Alumnos',    href: '/clientes',   icon: GraduationCap },
            { label: 'Asistencia', href: '/asistencia', icon: ClipboardList  },
        ],
    },
    {
        titulo: 'GESTION & COBROS',
        items: [
            { label: 'Servicios',    href: '/servicios',    icon: Layers    },
            { label: 'Inventario',   href: '/inventario',   icon: Boxes     },
            { label: 'Ventas',       href: '/ventas',       icon: Receipt   },
            { label: 'Gastos',       href: '/gastos',       icon: TrendingUp},
            { label: 'Cuentas x Cobrar', href: '/cuentas',  icon: Wallet      },
            { label: 'Agenda',             href: '/agenda', icon: CalendarDays },
        ],
    },
    {
        titulo: 'FINANZAS',
        items: [
            { label: 'Contabilidad',   href: '/contabilidad',  icon: BookOpen  },
            { label: 'Tasas y Cambio', href: '/cambio',        icon: DollarSign },
            { label: 'Conciliacion',   href: '/conciliacion',  icon: Scale,     modulo: 'conciliacion' },
            { label: 'Sociedad',       href: '/sociedad',      icon: Handshake  },
            { label: 'Analitica',      href: '/analitica',     icon: BarChart2  },
        ],
    },
    {
        titulo: 'SETTINGS',
        items: [
            { label: 'Configuracion', href: '/configuracion', icon: Settings     },
            { label: 'WhatsApp',      href: '/whatsapp',      icon: MessageSquare, modulo: 'whatsapp' },
        ],
    },
];

// ─── Sidebar Content (Figma Aesthetic) ──────────────────────────────────────

interface SidebarContentProps {
    mobile:              boolean;
    sidebarAbierto:      boolean;
    setSidebarAbierto:   (v: boolean) => void;
    setMobileMenuAbierto:(v: boolean) => void;
    navItemsFiltrados:   typeof NAV_ITEMS;
    pathname:            string;
    perfil:              any;
    handleLogout:        () => void;
    online:              boolean;
}

function SidebarContent({
    mobile, sidebarAbierto, setSidebarAbierto,
    setMobileMenuAbierto, navItemsFiltrados,
    pathname, perfil, handleLogout, online,
}: SidebarContentProps) {
    return (
        <div className="flex flex-col h-full bg-[#0B0F19] text-white">
            
            {/* Header del Sidebar (Perfil Superior) */}
            <div className={cn(
                'flex items-center p-4 mb-2 gap-3 transition-all',
                !sidebarAbierto && !mobile ? 'flex-col pt-6' : ''
            )}>
                <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-[2px]">
                        <div className="w-full h-full bg-[#0B0F19] rounded-full flex items-center justify-center border-2 border-[#0B0F19]">
                            <span className="text-sm font-bold uppercase tracking-wider">
                                {perfil?.nombre?.charAt(0) ?? 'A'}
                            </span>
                        </div>
                    </div>
                    {online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0B0F19] rounded-full" />}
                </div>

                {(mobile || sidebarAbierto) && (
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-0.5">
                            {perfil?.rol || 'Staff'}
                        </p>
                        <p className="text-[13px] font-medium text-white/90 truncate">
                            {perfil?.nombre || 'Usuario ATEMPO'}
                        </p>
                    </div>
                )}
            </div>

            {/* Separador */}
            <div className="w-full h-px bg-white/5 mb-4" />

            {/* Navegación Principal */}
            <nav className="flex-1 overflow-y-auto px-3 space-y-6 no-scrollbar pb-6">
                {navItemsFiltrados.map((grupo) => (
                    <div key={grupo.titulo}>
                        {(mobile || sidebarAbierto) && (
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-3 mb-2">
                                {grupo.titulo}
                            </p>
                        )}
                        
                        <div className="space-y-1">
                            {grupo.items.map((item) => {
                                const activo = pathname.startsWith(item.href);
                                const Icon   = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => mobile && setMobileMenuAbierto(false)}
                                        className={cn(
                                            'relative flex items-center gap-3 rounded-xl transition-all group',
                                            (mobile || sidebarAbierto) ? 'px-3 py-2.5' : 'justify-center p-3 my-1',
                                            activo 
                                                ? 'bg-blue-500/10 text-blue-400' 
                                                : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                                        )}
                                    >
                                        {/* 🪄 HACK PREMIUM: strokeWidth={1.5} para emular coolicons */}
                                        <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                                        
                                        {(mobile || sidebarAbierto) && (
                                            <span className={cn('text-[13px] font-medium tracking-wide', activo ? 'text-blue-400 font-semibold' : '')}>
                                                {item.label}
                                            </span>
                                        )}

                                        {/* Tooltip Cristalino en modo colapsado */}
                                        {!sidebarAbierto && !mobile && (
                                            <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1E2330] text-white text-[11px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-white/5 shadow-2xl flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rotate-45 bg-[#1E2330] border-l border-b border-white/5 absolute -left-[4px] top-1/2 -translate-y-1/2" />
                                                {item.label}
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer / Botón de Logout */}
            <div className="p-4 border-t border-white/5 shrink-0">
                <button
                    onClick={handleLogout}
                    className={cn(
                        'w-full flex items-center gap-3 rounded-xl transition-all group',
                        (mobile || sidebarAbierto) ? 'px-3 py-2.5 hover:bg-red-500/10 text-white/40 hover:text-red-400' : 'justify-center p-3 hover:bg-red-500/10 text-white/40 hover:text-red-400 relative'
                    )}
                >
                    <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                    {(mobile || sidebarAbierto) && <span className="text-[13px] font-medium">Cerrar Sesión</span>}

                    {/* Tooltip Logout */}
                    {!sidebarAbierto && !mobile && (
                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1E2330] text-red-400 text-[11px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-red-500/20 shadow-xl flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rotate-45 bg-[#1E2330] border-l border-b border-red-500/20 absolute -left-[4px] top-1/2 -translate-y-1/2" />
                            Salir
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
}

// ─── AppLayout Principal ──────────────────────────────────────────────────────

interface AppLayoutProps { children: React.ReactNode; }

export default function AppLayout({ children }: AppLayoutProps) {
    const [sidebarAbierto,    setSidebarAbierto]    = useState(true);
    const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);
    const [chatAbierto,       setChatAbierto]       = useState(false);
    const [online,            setOnline]            = useState(true);

    const pathname = usePathname();
    const router   = useRouter();
    const { perfil, logout } = useAuth() as { perfil: any; logout: () => void };
    const { tasas, cargando: cargandoTasas, refrescar } = useTasas();
    const noLeidosChat = useChatNoLeidos(perfil?.uid);

    const navItemsFiltrados = NAV_ITEMS.map(grupo => ({
        ...grupo,
        items: grupo.items.filter(item => tienePermiso(perfil?.rol as RolUsuario, item.href)),
    })).filter(grupo => grupo.items.length > 0);

    useEffect(() => {
        if (perfil?.rol && !tienePermiso(perfil.rol as RolUsuario, pathname)) {
            const rutaSegura = RUTA_INICIO_ROL[perfil.rol as RolUsuario] || '/pos';
            router.replace(rutaSegura);
        }
    }, [pathname, perfil, router]);

    useEffect(() => {
        const up   = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener('online',  up);
        window.addEventListener('offline', down);
        setOnline(navigator.onLine);
        return () => {
            window.removeEventListener('online',  up);
            window.removeEventListener('offline', down);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/auth');
    };

    const sidebarProps: SidebarContentProps = {
        mobile:               false,
        sidebarAbierto,
        setSidebarAbierto,
        setMobileMenuAbierto,
        navItemsFiltrados,
        pathname,
        perfil,
        handleLogout,
        online,
    };

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-sans">

            {/* ── Sidebar desktop ── */}
            <aside className={cn(
                'hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative z-40',
                sidebarAbierto ? 'w-[260px]' : 'w-[80px]',
            )}>
                <SidebarContent {...sidebarProps} />
            </aside>

            {/* ── Contenido principal ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative lg:rounded-tl-3xl bg-[#080B12] border-l border-t border-white/5 shadow-2xl">

                {/* Header Superior Glassmorphism */}
                <header className="bg-[#080B12]/80 backdrop-blur-xl border-b border-white/[0.04] px-6 h-16 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">

                    <div className="flex items-center gap-4">
                        {/* Botón Contraer Menú (Solo Desktop) */}
                        <button
                            onClick={() => setSidebarAbierto(!sidebarAbierto)}
                            className="hidden lg:flex w-8 h-8 rounded-lg hover:bg-white/5 items-center justify-center text-white/30 hover:text-white transition-all"
                        >
                            {sidebarAbierto ? <ChevronLeft strokeWidth={1.5} /> : <ChevronRight strokeWidth={1.5} />}
                        </button>
                        
                        {/* Botón Menú (Solo Móvil) */}
                        <button
                            className="lg:hidden text-white/40 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-all"
                            onClick={() => setMobileMenuAbierto(true)}
                        >
                            <Menu strokeWidth={1.5} className="w-5 h-5" />
                        </button>

                        {/* Widgets Financieros Minimalistas */}
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mask-gradient">
                            {(cargandoTasas || !tasas) ? (
                                <div className="flex gap-2">
                                    <div className="skeleton h-8 w-24 rounded-lg opacity-20" />
                                    <div className="skeleton h-8 w-24 rounded-lg opacity-20" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 flex-nowrap">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">BCV</span>
                                        <span className="text-[13px] text-blue-400 font-mono font-medium">Bs {tasas.bcv.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Paralelo</span>
                                        <span className="text-[13px] text-amber-400 font-mono font-medium">Bs {tasas.paralelo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={refrescar} disabled={cargandoTasas}
                            className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all"
                        >
                            <RefreshCw className={cn('w-4 h-4', cargandoTasas && 'animate-spin')} strokeWidth={1.5} />
                        </button>

                        <button
                            onClick={() => setChatAbierto(v => !v)}
                            className={cn(
                                'relative w-9 h-9 flex items-center justify-center rounded-full transition-all',
                                chatAbierto ? 'text-yellow-400 bg-yellow-500/10' : 'text-white/40 hover:text-white hover:bg-white/5',
                            )}
                        >
                            <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                            {noLeidosChat > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500 ring-2 ring-[#080B12]" />
                            )}
                        </button>

                        <button className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all relative">
                            <Bell className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
                    {children}
                </main>
            </div>

            <InternalChatPanel abierto={chatAbierto} onCerrar={() => setChatAbierto(false)} />

            {/* ── Sidebar móvil ── */}
            {mobileMenuAbierto && (
                <div className="lg:hidden fixed inset-0 z-[100] flex">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuAbierto(false)} />
                    <aside className="relative w-[280px] flex flex-col bg-[#0B0F19] shadow-2xl animate-slide-in">
                        <SidebarContent {...sidebarProps} mobile={true} />
                    </aside>
                </div>
            )}
        </div>
    );
}
