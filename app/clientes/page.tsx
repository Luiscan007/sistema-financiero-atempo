'use client';

/**
 * app/clientes/page.tsx
 * Gestión de clientes con historial, crédito y clasificación
 */

import { useState } from 'react';
import {
    Plus, Search, Edit2, Trash2, X, CheckCircle2, Star,
    Phone, Mail, MapPin, DollarSign, ShoppingCart, Users,
    Crown, MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBs, formatUSD, formatTelefono } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Cliente {
    id: string;
    nombre: string;
    cedula?: string;
    rif?: string;
    telefono: string;
    email?: string;
    direccion?: string;
    clasificacion: 'regular' | 'vip' | 'mayorista';
    creditoDisponible: number;
    deudaActual: number;
    totalCompras: number;
    numeroPedidos: number;
    fechaRegistro: string;
    activo: boolean;
    notas?: string;
}

const CLIENTES_DEMO: Cliente[] = [
    { id: '1', nombre: 'Juan Carlos Pérez', cedula: 'V-15234567', telefono: '04141234567', email: 'juan@gmail.com', clasificacion: 'regular', creditoDisponible: 50000, deudaActual: 0, totalCompras: 285000, numeroPedidos: 45, fechaRegistro: '2023-06-15', activo: true },
    { id: '2', nombre: 'Empresa Distribuidora El Sol CA', rif: 'J-12345678-9', telefono: '02124567890', email: 'compras@elsol.com', clasificacion: 'mayorista', creditoDisponible: 500000, deudaActual: 45000, totalCompras: 2850000, numeroPedidos: 120, fechaRegistro: '2022-03-10', activo: true },
    { id: '3', nombre: 'María Fernanda García', cedula: 'V-18765432', telefono: '04261234567', email: 'maria.garcia@email.com', clasificacion: 'vip', creditoDisponible: 100000, deudaActual: 12000, totalCompras: 580000, numeroPedidos: 89, fechaRegistro: '2023-01-20', activo: true },
    { id: '4', nombre: 'Carlos Antonio López', cedula: 'V-20123456', telefono: '04161234567', clasificacion: 'regular', creditoDisponible: 25000, deudaActual: 8500, totalCompras: 125000, numeroPedidos: 22, fechaRegistro: '2024-01-05', activo: true },
    { id: '5', nombre: 'Restaurante La Cúpula', rif: 'J-98765432-1', telefono: '02129876543', email: 'admin@lacupula.com', clasificacion: 'vip', creditoDisponible: 200000, deudaActual: 28000, totalCompras: 1200000, numeroPedidos: 67, fechaRegistro: '2022-09-15', activo: true },
];

const ICONO_CLASIFICACION: Record<string, any> = {
    regular: Users,
    vip: Crown,
    mayorista: Star,
};

const COLOR_CLASIFICACION: Record<string, string> = {
    regular: 'badge-gray',
    vip: 'badge-yellow',
    mayorista: 'badge-blue',
};

function ModalCliente({
    cliente,
    onCerrar,
    onGuardar,
}: {
    cliente: Partial<Cliente> | null;
    onCerrar: () => void;
    onGuardar: (c: Cliente) => void;
}) {
    const [form, setForm] = useState<Partial<Cliente>>(cliente || {
        nombre: '', telefono: '', clasificacion: 'regular',
        creditoDisponible: 0, deudaActual: 0, totalCompras: 0,
        numeroPedidos: 0, fechaRegistro: new Date().toISOString().split('T')[0], activo: true,
    });

    const actualizar = (campo: string, valor: any) => setForm(prev => ({ ...prev, [campo]: valor }));
    const esEdicion = !!(cliente as any)?.id;

    const guardar = () => {
        if (!form.nombre || !form.telefono) {
            toast.error('Nombre y teléfono son requeridos');
            return;
        }
        onGuardar({
            ...form,
            id: (cliente as any)?.id || Date.now().toString(),
        } as Cliente);
        toast.success(esEdicion ? 'Cliente actualizado' : 'Cliente creado');
        onCerrar();
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-lg font-semibold">{esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                    <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Nombre completo / Empresa *</label>
                            <input
                                className="input-sistema"
                                value={form.nombre || ''}
                                onChange={(e) => actualizar('nombre', e.target.value)}
                                placeholder="Nombre del cliente"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Cédula / RIF</label>
                            <input
                                className="input-sistema"
                                value={form.cedula || form.rif || ''}
                                onChange={(e) => actualizar('cedula', e.target.value)}
                                placeholder="V-XXXXXXXX o J-XXXXXXXX-X"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Teléfono *</label>
                            <input
                                type="tel"
                                className="input-sistema"
                                value={form.telefono || ''}
                                onChange={(e) => actualizar('telefono', e.target.value)}
                                placeholder="04XX-XXX-XXXX"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                            <input
                                type="email"
                                className="input-sistema"
                                value={form.email || ''}
                                onChange={(e) => actualizar('email', e.target.value)}
                                placeholder="correo@email.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Clasificación</label>
                            <select
                                className="input-sistema"
                                value={form.clasificacion || 'regular'}
                                onChange={(e) => actualizar('clasificacion', e.target.value)}
                            >
                                <option value="regular">Regular</option>
                                <option value="vip">VIP</option>
                                <option value="mayorista">Mayorista</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
                            <input
                                className="input-sistema"
                                value={form.direccion || ''}
                                onChange={(e) => actualizar('direccion', e.target.value)}
                                placeholder="Dirección del cliente"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Crédito disponible (Bs)</label>
                            <input
                                type="number"
                                className="input-sistema font-mono"
                                value={form.creditoDisponible || ''}
                                onChange={(e) => actualizar('creditoDisponible', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
                            <input
                                className="input-sistema"
                                value={form.notas || ''}
                                onChange={(e) => actualizar('notas', e.target.value)}
                                placeholder="Notas internas..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onCerrar} className="btn-secondary">Cancelar</button>
                        <button onClick={guardar} className="btn-primary">
                            <CheckCircle2 className="w-4 h-4" />
                            {esEdicion ? 'Actualizar' : 'Crear Cliente'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>(CLIENTES_DEMO);
    const [busqueda, setBusqueda] = useState('');
    const [clasificacionFiltro, setClasificacionFiltro] = useState('todos');
    const [modalCliente, setModalCliente] = useState<Partial<Cliente> | null | undefined>(undefined);

    const clientesFiltrados = clientes.filter((c) => {
        const matchBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            (c.telefono?.includes(busqueda) ?? false) ||
            (c.cedula?.includes(busqueda) ?? false);
        const matchClasificacion = clasificacionFiltro === 'todos' || c.clasificacion === clasificacionFiltro;
        return matchBusqueda && matchClasificacion;
    });

    const guardarCliente = (cliente: Cliente) => {
        const existe = clientes.find((c) => c.id === cliente.id);
        if (existe) {
            setClientes(clientes.map((c) => c.id === cliente.id ? cliente : c));
        } else {
            setClientes([...clientes, cliente]);
        }
    };

    const eliminarCliente = (id: string) => {
        setClientes(clientes.filter((c) => c.id !== id));
        toast.success('Cliente eliminado');
    };

    const abrirWhatsApp = (telefono: string, nombre: string) => {
        const numero = telefono.replace(/\D/g, '');
        const texto = `Hola ${nombre}, le contactamos desde nuestra tienda.`;
        window.open(`https://wa.me/58${numero.slice(1)}?text=${encodeURIComponent(texto)}`, '_blank');
    };

    const totalDeuda = clientesFiltrados.reduce((acc, c) => acc + c.deudaActual, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Clientes</h1>
                    <p className="text-muted-foreground text-sm">
                        {clientesFiltrados.length} clientes · Deuda total: {formatBs(totalDeuda)}
                    </p>
                </div>
                <button className="btn-primary text-sm" onClick={() => setModalCliente({})}>
                    <Plus className="w-4 h-4" /> Nuevo Cliente
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {['regular', 'vip', 'mayorista'].map((tipo) => {
                    const count = clientes.filter((c) => c.clasificacion === tipo).length;
                    const Icono = ICONO_CLASIFICACION[tipo];
                    return (
                        <div key={tipo} className="kpi-card text-center cursor-pointer" onClick={() => setClasificacionFiltro(tipo === clasificacionFiltro ? 'todos' : tipo)}>
                            <Icono className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs text-muted-foreground capitalize">{tipo}</p>
                        </div>
                    );
                })}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        className="input-sistema pl-10"
                        placeholder="Buscar por nombre, cédula o teléfono..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <select
                    className="input-sistema w-auto"
                    value={clasificacionFiltro}
                    onChange={(e) => setClasificacionFiltro(e.target.value)}
                >
                    <option value="todos">Todos</option>
                    <option value="regular">Regular</option>
                    <option value="vip">VIP</option>
                    <option value="mayorista">Mayorista</option>
                </select>
            </div>

            {/* Tabla */}
            <div className="card-sistema overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="tabla-sistema">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Contacto</th>
                                <th>Clasificación</th>
                                <th>Total Compras</th>
                                <th>Deuda Actual</th>
                                <th>Crédito</th>
                                <th>Pedidos</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientesFiltrados.map((cliente) => {
                                const Icono = ICONO_CLASIFICACION[cliente.clasificacion];
                                return (
                                    <tr key={cliente.id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-blue-400">
                                                        {cliente.nombre.charAt(0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{cliente.nombre}</p>
                                                    <p className="text-xs text-muted-foreground">{cliente.cedula || cliente.rif}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-xs space-y-0.5">
                                                <p className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                                    {formatTelefono(cliente.telefono)}
                                                </p>
                                                {cliente.email && (
                                                    <p className="flex items-center gap-1 text-muted-foreground">
                                                        <Mail className="w-3 h-3" />
                                                        {cliente.email}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={cn('badge text-xs flex items-center gap-1 w-fit', COLOR_CLASIFICACION[cliente.clasificacion])}>
                                                <Icono className="w-2.5 h-2.5" />
                                                {cliente.clasificacion}
                                            </span>
                                        </td>
                                        <td className="font-mono text-sm text-green-400">
                                            {formatBs(cliente.totalCompras)}
                                        </td>
                                        <td>
                                            {cliente.deudaActual > 0 ? (
                                                <span className="font-mono text-sm text-red-400">{formatBs(cliente.deudaActual)}</span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Sin deuda</span>
                                            )}
                                        </td>
                                        <td className="font-mono text-sm text-muted-foreground">
                                            {formatBs(cliente.creditoDisponible)}
                                        </td>
                                        <td className="text-sm text-center">{cliente.numeroPedidos}</td>
                                        <td>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    className="text-muted-foreground hover:text-green-400 transition-colors"
                                                    onClick={() => abrirWhatsApp(cliente.telefono, cliente.nombre)}
                                                    title="WhatsApp"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="text-muted-foreground hover:text-blue-400 transition-colors"
                                                    onClick={() => setModalCliente(cliente)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="text-muted-foreground hover:text-red-400 transition-colors"
                                                    onClick={() => eliminarCliente(cliente.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalCliente !== undefined && (
                <ModalCliente
                    cliente={modalCliente}
                    onCerrar={() => setModalCliente(undefined)}
                    onGuardar={guardarCliente}
                />
            )}
        </div>
    );
}
