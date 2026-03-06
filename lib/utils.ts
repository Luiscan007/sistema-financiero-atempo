import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBs(monto: number, conSimbolo = true): string {
  const formateado = monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return conSimbolo ? `Bs. ${formateado}` : formateado;
}

export function formatUSD(monto: number): string {
  return '$ ' + monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatEUR(monto: number): string {
  return '€ ' + monto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatUSDT(monto: number): string {
  return monto.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' USDT';
}

export function formatFechaHora(fecha: Date | string): string {
  const d = new Date(fecha);
  return d.toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatFecha(fecha: Date | string): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatHora(fecha: Date | string): string {
  const d = new Date(fecha);
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

export function formatNumero(num: number): string {
  return num.toLocaleString('es-VE');
}

export function formatPorcentaje(valor: number): string {
  return valor.toFixed(1) + '%';
}

export function formatTelefono(telefono: string): string {
  const limpio = telefono.replace(/\D/g, '');
  if (limpio.length === 11) return `${limpio.slice(0, 4)}-${limpio.slice(4, 7)}-${limpio.slice(7)}`;
  return telefono;
}

export function getIniciales(nombre: string): string {
  return nombre.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function calcularBrecha(tasaParalela: number, tasaBCV: number): number {
  if (!tasaBCV || tasaBCV === 0) return 0;
  return ((tasaParalela - tasaBCV) / tasaBCV) * 100;
}

export function calcularCambioPercent(valorActual: number, valorAnterior: number): number {
  if (!valorAnterior || valorAnterior === 0) return 0;
  return ((valorActual - valorAnterior) / valorAnterior) * 100;
}

export function colorBrecha(brecha: number): string {
  if (brecha > 50) return 'text-red-500';
  if (brecha > 20) return 'text-yellow-400';
  return 'text-green-400';
}

export function nivelBrecha(brecha: number): 'BAJA' | 'MEDIA' | 'ALTA' {
  if (brecha > 50) return 'ALTA';
  if (brecha > 20) return 'MEDIA';
  return 'BAJA';
}

export function generarNumeroRecibo(): string {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `VEN-${año}${mes}${dia}-${random}`;
}

export const CATEGORIAS_GASTOS = [
  'Alquiler',
  'Nómina / Sueldos',
  'Servicios Básicos (Luz, Agua, Gas)',
  'Internet y Telefonía',
  'Proveedores / Mercancía',
  'Transporte y Logística',
  'Publicidad y Marketing',
  'Impuestos y Tasas',
  'Mantenimiento y Reparaciones',
  'Alimentación del Personal',
  'Equipos y Herramientas',
  'Seguridad',
  'Otros',
];

export const BANCOS_VENEZOLANOS = [
  'Banesco', 'Mercantil', 'Provincial (BBVA)', 'Banco de Venezuela (BDV)',
  'BNC', 'Bicentenario', 'Banco del Tesoro', 'Bancrecer', 'Sofitasa',
  'Banco Exterior', 'Banplus', 'Bancamiga', 'Del Sur', 'Activo', 'Caroni', 'Otro',
];

export const ROLES_USUARIO = ['admin', 'vendedor', 'contador', 'lectura'] as const;
export type typeRolUsuario = typeof ROLES_USUARIO[number];
