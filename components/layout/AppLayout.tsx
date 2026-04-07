'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
// Importación masiva de Coolicons (Ya instalada en tu package.json)
import { 
    Dashboard, ShoppingCart, Grid, User, 
    Checklist, Layer, Package, Receipt, 
    TrendingUp, Wallet, Calendar, Note, 
    Dollar, Scale, UserCheck, BarChart, 
    Settings, Chat, Exit, ChevronLeft, 
    ChevronRight, Refresh, Bell, Warning,
    Menu, Close, Activity, WifiOff
} from 'react-coolicons';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTasas } from '@/components/providers/TasasProvider';
import { cn } from '@/lib/utils';
import { tienePermiso, RUTA_INICIO_ROL, RolUsuario } from '@/lib/roles';
import { InternalChatPanel, useChatNoLeidos } from '@/components/chat/InternalChatPanel';

// ─── Navegación con Coolicons ────────────────────────────────────────────────

const NAV_ITEMS = [
    {
        titulo: 'MAIN',
        items: [
            { label: 'Dashboard',      href: '/dashboard', icon: Dashboard    },
            { label: 'Punto de Venta', href: '/pos',       icon: ShoppingCart },
            { label: 'Estudio en Vivo', href: '/estudio',  icon: Grid         },
        ],
    },
    {
        titulo: 'ACADEMIA',
        items: [
            { label: 'Alumnos',    href: '/clientes',   icon: User      },
            { label: 'Asistencia', href: '/asistencia', icon: Checklist },
        ],
    },
    {
        titulo: 'GESTION & COBROS',
        items: [
            { label: 'Servicios',    href: '/servicios',    icon: Layer   },
            { label: 'Inventario',   href: '/inventario',   icon: Package },
            { label: 'Ventas',       href: '/ventas',       icon: Receipt },
            { label: 'Gastos',       href: '/gastos',       icon: TrendingUp },
            { label: 'Cuentas x Cobrar', href: '/cuentas',  icon: Wallet  },
            { label: 'Agenda',             href: '/agenda', icon: Calendar },
        ],
    },
    {
        titulo: 'FINANZAS',
        items: [
            { label: 'Contabilidad',   href: '/contabilidad',  icon: Note      },
            { label: 'Tasas y Cambio', href: '/cambio',        icon: Dollar    },
            { label: 'Conciliacion',   href: '/conciliacion',  icon: Scale     },
            { label: 'Sociedad',       href: '/sociedad',      icon: UserCheck },
            { label: 'Analitica',      href: '/analitica',     icon: BarChart  },
        ],
    },
    {
        titulo: 'SETTINGS',
        items: [
            { label: 'Configuracion', href: '/configuracion', icon: Settings },
            { label: 'WhatsApp',      href: '/whatsapp',      icon: Chat     },
        ],
    },
];

// ─── Lógica de Tema ───────────────────────────────────────────────────────────

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
    return { tema, toggleTema: () => setTema(t => t === 'dark' ? 'light' : 'dark') };
}

// ─── Sidebar (Estilo Figma + Coolicons) ──────────────────────────────────────

function SidebarContent({
    mobile, sidebarAbierto, setSidebarAbierto,
    setMobileMenuAbierto, navItemsFiltrados,
    pathname, perfil, handleLogout, online,
}: any) {
    return (
        <div className="flex flex-col h-full bg-[#0B0F19] text-white">
            
            {/* Header: Perfil (Top en Figma) */}
            <div className={cn(
                'flex items-center p-4 mb-2 gap-3 transition-all',
                !sidebarAbierto && !mobile ? 'flex-col pt-6' : ''
            )}>
                <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-[2px]">
                        <div className="w-full h-full bg-[#0B0F19] rounded-full flex items-center justify-center border-2 border-[#0B0F19]">
                            <span className="text-sm font-bold uppercase">{perfil?.nombre?.[0] || 'A'}</span>
                        </div>
                    </div>
                    {online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0B0F19] rounded-full" />}
                </div>

                {(mobile || sidebarAbierto) && (
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">{perfil?.rol || 'Staff'}</p>
                        <p className="text-[13px] font-medium truncate">{perfil?.nombre || 'Usuario'}</p>
                    </div>
                )}
            </div>

            <div className="w-full h-px bg-white/5 mb-4" />

            {/* Nav con Tooltips */}
            <nav className="flex-1 overflow-y-auto px-3 space-y-6 no-scrollbar pb-6">
                {navItemsFiltrados.map((grupo: any) => (
                    <div key={grupo.titulo}>
                        {(mobile || sidebarAbierto) && (
                            <p className="text-[10px] font-black text-white/20 px-3 mb-2 tracking-[0.2em]">{grupo.titulo}</p>
                        )}
                        <div className="space-y-1">
                            {grupo.items.map((item: any) => {
                                const activo = pathname.startsWith(item.href);
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => mobile && setMobileMenuAbierto(false)}
                                        className={cn(
                                            'group relative flex items-center gap-3 rounded-xl transition-all',
                                            (mobile || sidebarAbierto) ? 'px-3 py-2.5' : 'justify-center p-3',
                                            activo ? 'bg-blue-500/10 text-blue-400' : 'text-white/40 hover:text-white hover:bg-white/5'
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {(mobile || sidebarAbierto) && <span className="text-[13px] font-medium">{item.label}</span>}
                                        
                                        {!sidebarAbierto && !mobile && (
                                            <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1E2330] text-white text-[11px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-white/5 shadow-2xl">
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

            {/* Logout */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className={cn(
                        'w-full flex items-center gap-3 text-white/40 hover:text-red-400 transition-all group',
                        (mobile || sidebarAbierto) ? 'px-3 py-2.5' : 'justify-center p-3'
                    )}
                >
                    <Exit className="w-5 h-5" />
                    {(mobile || sidebarAbierto) && <span className="text-[13px] font-medium">Cerrar Sesión</span>}
                </button>
            </div>
        </div>
    );
}

// ─── Layout Principal ────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarAbierto, setSidebarAbierto] = useState(true);
    const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);
    const [chatAbierto, setChatAbierto] = useState(false);
    const [online, setOnline] = useState(true);

    const pathname = usePathname();
    const router = useRouter();
    const { perfil, logout } = useAuth() as any;
    const { tasas, cargando: cargandoTasas, refrescar } = useTasas();
    const noLeidosChat = useChatNoLeidos(perfil?.uid);

    const navItemsFiltrados = NAV_ITEMS.map(grupo => ({
        ...grupo,
        items: grupo.items.filter(item => tienePermiso(perfil?.rol as RolUsuario, item.href)),
    })).filter(grupo => grupo.items.length > 0);

    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener('online', up);
        window.addEventListener('offline', down);
        return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
    }, []);

    const handleLogout = async () => { await logout(); router.push('/auth'); };

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden">
            
            {/* Sidebar Desktop */}
            <aside className={cn('hidden lg:flex flex-col flex-shrink-0 transition-all duration-300', sidebarAbierto ? 'w-64' : 'w-20')}>
                <SidebarContent 
                    sidebarAbierto={sidebarAbierto} setSidebarAbierto={setSidebarAbierto}
                    navItemsFiltrados={navItemsFiltrados} pathname={pathname}
                    perfil={perfil} handleLogout={handleLogout} online={online}
                />
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#080B12] lg:rounded-tl-[2rem] border-l border-t border-white/5 overflow-hidden shadow-2xl">
                
                <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#080B12]/80 backdrop-blur-xl sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarAbierto(!sidebarAbierto)} className="hidden lg:block text-white/30 hover:text-white">
                            {sidebarAbierto ? <ChevronLeft /> : <ChevronRight />}
                        </button>
                        <button onClick={() => setMobileMenuAbierto(true)} className="lg:hidden text-white/30"><Menu /></button>
                        
                        {/* Indicadores Financieros */}
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                            {!tasas ? <div className="w-32 h-6 bg-white/5 animate-pulse rounded-lg" /> : (
                                <>
                                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px]">
                                        <span className="text-white/40 mr-2">BCV</span>
                                        <span className="text-blue-400 font-mono">Bs {tasas.bcv.toFixed(2)}</span>
                                    </div>
                                    <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px]">
                                        <span className="text-white/40 mr-2">PARALELO</span>
                                        <span className="text-amber-400 font-mono">Bs {tasas.paralelo.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={refrescar} className="p-2 text-white/30 hover:text-white transition-all"><Refresh className={cn('w-4 h-4', cargandoTasas && 'animate-spin')} /></button>
                        <button onClick={() => setChatAbierto(true)} className="relative p-2 text-white/30 hover:text-white">
                            <Chat className="w-5 h-5" />
                            {noLeidosChat > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-500 rounded-full ring-2 ring-[#080B12]" />}
                        </button>
                        <button className="p-2 text-white/30 hover:text-white"><Bell className="w-5 h-5" /></button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-10 no-scrollbar">
                    {children}
                </main>
            </div>

            <InternalChatPanel abierto={chatAbierto} onCerrar={() => setChatAbierto(false)} />

            {/* Móvil */}
            {mobileMenuAbierto && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuAbierto(false)} />
                    <aside className="relative w-64 bg-[#0B0F19]"><SidebarContent mobile={true} navItemsFiltrados={navItemsFiltrados} pathname={pathname} perfil={perfil} handleLogout={handleLogout} online={online} setMobileMenuAbierto={setMobileMenuAbierto} /></aside>
                </div>
            )}
        </div>
    );
}
