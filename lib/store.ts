/**
 * lib/store.ts
 * Estado global con Zustand
 * Maneja: tasas de cambio, carrito POS, usuario, configuración del negocio
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TasasCambio, TASAS_DEMO } from './tasas';

// ============================
// INTERFACES
// ============================

export interface ProductoCarrito {
    id: string;
    nombre: string;
    codigo: string;
    precio: number; // En Bs
    cantidad: number;
    descuento: number; // Porcentaje
    notas?: string;
    subtotal: number; // precio * cantidad con descuento
}

export interface PagoMetodo {
    tipo: 'punto_venta' | 'pago_movil' | 'efectivo_bs' | 'efectivo_usd' | 'efectivo_eur' | 'transferencia';
    monto: number; // En Bs siempre
    // Punto de venta
    ultimosCuatro?: string;
    aprobacion?: string;
    bancoPOS?: string;
    tipoTarjeta?: 'debito' | 'credito';
    // Pago móvil
    telefonoCliente?: string;
    bancoOrigen?: string;
    referencia?: string;
    cedula?: string;
    // Efectivo
    montoRecibido?: number;
    cambio?: number;
    tasaUsada?: number; // Para USD/EUR efectivo
    // Transferencia
    bancoDestino?: string;
    fechaTransferencia?: string;
}

export interface ConfigNegocio {
    nombre: string;
    rif: string;
    direccion: string;
    telefono: string;
    logoUrl?: string;
    whatsapp?: string;
    // Datos bancarios pago móvil
    bancoPagoMovil?: string;
    telefonoPagoMovil?: string;
    titularPagoMovil?: string;
    // POS
    numeroPOS?: string;
    bancoPOS?: string;
    // Preferencias
    monedaPrincipal: 'bs' | 'usd';
    tasaPreferida: 'bcv' | 'paralelo';
    pieDeRecibo?: string;
}

// ============================
// STORE DE TASAS
// ============================
interface TasasStore {
    tasas: TasasCambio;
    cargando: boolean;
    tasaSeleccionada: 'bcv' | 'paralelo';
    setTasas: (tasas: TasasCambio) => void;
    setCargando: (cargando: boolean) => void;
    setTasaSeleccionada: (tasa: 'bcv' | 'paralelo') => void;
    getTasaActual: () => number;
}

export const useTasasStore = create<TasasStore>((set, get) => ({
    tasas: TASAS_DEMO,
    cargando: true,
    tasaSeleccionada: 'bcv',
    setTasas: (tasas) => set({ tasas }),
    setCargando: (cargando) => set({ cargando }),
    setTasaSeleccionada: (tasaSeleccionada) => set({ tasaSeleccionada }),
    getTasaActual: () => {
        const { tasas, tasaSeleccionada } = get();
        return tasaSeleccionada === 'bcv' ? tasas.bcv : tasas.paralelo;
    },
}));

// ============================
// STORE DEL CARRITO POS
// Persistido en localStorage para modo offline
// ============================
interface CarritoStore {
    items: ProductoCarrito[];
    clienteId?: string;
    clienteNombre?: string;
    descuentoGlobal: number; // Porcentaje
    metodoPago: PagoMetodo[];
    notas: string;
    tasaUsada: number; // Tasa al momento de la venta
    // Acciones
    agregarItem: (producto: ProductoCarrito) => void;
    quitarItem: (id: string) => void;
    actualizarCantidad: (id: string, cantidad: number) => void;
    actualizarDescuento: (id: string, descuento: number) => void;
    actualizarNotas: (id: string, notas: string) => void;
    setDescuentoGlobal: (descuento: number) => void;
    setCliente: (id: string, nombre: string) => void;
    agregarMetodoPago: (metodo: PagoMetodo) => void;
    actualizarMetodoPago: (index: number, metodo: PagoMetodo) => void;
    quitarMetodoPago: (index: number) => void;
    setNotas: (notas: string) => void;
    setTasaUsada: (tasa: number) => void;
    limpiarCarrito: () => void;
    calcularSubtotal: () => number;
    calcularDescuento: () => number;
    calcularTotal: () => number;
    calcularTotalUSD: () => number;
    calcularTotalPagado: () => number;
    calcularVuelto: () => number;
}

export const useCarritoStore = create<CarritoStore>()(
    persist(
        (set, get) => ({
            items: [],
            clienteId: undefined,
            clienteNombre: undefined,
            descuentoGlobal: 0,
            metodoPago: [],
            notas: '',
            tasaUsada: TASAS_DEMO.bcv,

            agregarItem: (producto) => {
                const { items } = get();
                const existente = items.find((i) => i.id === producto.id);

                if (existente) {
                    // Incrementar cantidad si ya existe
                    set({
                        items: items.map((i) =>
                            i.id === producto.id
                                ? {
                                    ...i,
                                    cantidad: i.cantidad + 1,
                                    subtotal: (i.cantidad + 1) * i.precio * (1 - i.descuento / 100),
                                }
                                : i
                        ),
                    });
                } else {
                    set({ items: [...items, producto] });
                }
            },

            quitarItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

            actualizarCantidad: (id, cantidad) => {
                if (cantidad <= 0) {
                    get().quitarItem(id);
                    return;
                }
                set({
                    items: get().items.map((i) =>
                        i.id === id
                            ? {
                                ...i,
                                cantidad,
                                subtotal: cantidad * i.precio * (1 - i.descuento / 100),
                            }
                            : i
                    ),
                });
            },

            actualizarDescuento: (id, descuento) => {
                set({
                    items: get().items.map((i) =>
                        i.id === id
                            ? {
                                ...i,
                                descuento,
                                subtotal: i.cantidad * i.precio * (1 - descuento / 100),
                            }
                            : i
                    ),
                });
            },

            actualizarNotas: (id, notas) => {
                set({
                    items: get().items.map((i) => (i.id === id ? { ...i, notas } : i)),
                });
            },

            setDescuentoGlobal: (descuentoGlobal) => set({ descuentoGlobal }),
            setCliente: (clienteId, clienteNombre) => set({ clienteId, clienteNombre }),
            agregarMetodoPago: (metodo) => set({ metodoPago: [...get().metodoPago, metodo] }),
            actualizarMetodoPago: (index, metodo) => {
                const metodos = [...get().metodoPago];
                metodos[index] = metodo;
                set({ metodoPago: metodos });
            },
            quitarMetodoPago: (index) => {
                set({ metodoPago: get().metodoPago.filter((_, i) => i !== index) });
            },
            setNotas: (notas) => set({ notas }),
            setTasaUsada: (tasaUsada) => set({ tasaUsada }),

            limpiarCarrito: () =>
                set({
                    items: [],
                    clienteId: undefined,
                    clienteNombre: undefined,
                    descuentoGlobal: 0,
                    metodoPago: [],
                    notas: '',
                }),

            calcularSubtotal: () => {
                return get().items.reduce((acc, item) => acc + item.subtotal, 0);
            },

            calcularDescuento: () => {
                const subtotal = get().calcularSubtotal();
                return subtotal * (get().descuentoGlobal / 100);
            },

            calcularTotal: () => {
                return get().calcularSubtotal() - get().calcularDescuento();
            },

            calcularTotalUSD: () => {
                const total = get().calcularTotal();
                const tasa = get().tasaUsada;
                return tasa > 0 ? total / tasa : 0;
            },

            calcularTotalPagado: () => {
                return get().metodoPago.reduce((acc, m) => acc + m.monto, 0);
            },

            calcularVuelto: () => {
                return get().calcularTotalPagado() - get().calcularTotal();
            },
        }),
        {
            name: 'atempo-carrito',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// ============================
// STORE DE CONFIGURACIÓN
// ============================
interface ConfigStore {
    config: ConfigNegocio;
    setConfig: (config: Partial<ConfigNegocio>) => void;
}

export const useConfigStore = create<ConfigStore>()(
    persist(
        (set, get) => ({
            config: {
                nombre: 'Mi Negocio',
                rif: 'J-00000000-0',
                direccion: 'Caracas, Venezuela',
                telefono: '0212-000-0000',
                monedaPrincipal: 'bs',
                tasaPreferida: 'bcv',
                pieDeRecibo: 'Gracias por su compra. No se aceptan devoluciones sin factura.',
            },
            setConfig: (nuevaConfig) =>
                set({ config: { ...get().config, ...nuevaConfig } }),
        }),
        {
            name: 'atempo-config',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
