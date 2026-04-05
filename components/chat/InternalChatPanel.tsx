'use client';

/**
 * components/chat/InternalChatPanel.tsx
 *
 * FIRESTORE:
 * chat_canales  → { tipo, nombre?, participantes[], nombres{uid:nombre},
 *                   ultimoMensaje, ultimoTimestamp, noLeidos{uid:n}, icono? }
 * chat_mensajes → { canalId, autorId, autorNombre, autorRol, texto, tipo,
 *                   archivoUrl?, archivoNombre?, archivoTipo?,
 *                   eventoData?, leido[], timestamp }
 * clientes_staff→ { nombre, rol, online, ultimaVez }
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    collection, query, where, orderBy, onSnapshot,
    addDoc, updateDoc, doc, serverTimestamp, Timestamp,
    setDoc, getDoc, getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
    X, Send, Plus, Paperclip, Zap, Calendar,
    MessageSquare, Users, ArrowLeft, Hash,
    CheckCheck, Check, Search, FileText,
    Download, ChevronRight, UserPlus, Settings2,
    Circle,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoMensaje = 'texto' | 'imagen' | 'archivo' | 'evento' | 'respuesta_rapida';

interface Mensaje {
    id:             string;
    canalId:        string;
    autorId:        string;
    autorNombre:    string;
    autorRol:       string;
    texto:          string;
    tipo:           TipoMensaje;
    archivoUrl?:    string;
    archivoNombre?: string;
    archivoTipo?:   'imagen' | 'pdf' | 'otro';
    eventoData?:    EventoData;
    leido:          string[];
    timestamp:      Timestamp;
}

interface EventoData {
    titulo:        string;
    fecha:         string;
    hora:          string;
    descripcion:   string;
    participantes: string[];
}

interface Canal {
    id:              string;
    tipo:            'general' | 'dm' | 'grupo';
    nombre?:         string;
    icono?:          string;
    participantes:   string[];
    nombres:         Record<string, string>;
    ultimoMensaje:   string;
    ultimoTimestamp: Timestamp | null;
    noLeidos:        Record<string, number>;
}

interface UsuarioOnline {
    uid:    string;
    nombre: string;
    rol:    string;
    online: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const RESPUESTAS_RAPIDAS = [
    { emoji: '✅', texto: 'Revisado' },
    { emoji: '👍', texto: 'Aprobado' },
    { emoji: '⏳', texto: 'Cliente en espera' },
    { emoji: '🔄', texto: 'En proceso' },
    { emoji: '❌', texto: 'Rechazado — revisar' },
    { emoji: '💰', texto: 'Pago confirmado' },
    { emoji: '📞', texto: 'Llamar al cliente' },
    { emoji: '🎯', texto: 'Listo para entrega' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtHora(ts: Timestamp | null): string {
    if (!ts) return '';
    return ts.toDate().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

function fmtSeparador(ts: Timestamp): string {
    const d = ts.toDate();
    const hoy  = new Date();
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    if (d.toDateString() === hoy.toDateString())  return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
}

function iniciales(nombre: string): string {
    return (nombre || '?').split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();
}

function dmId(a: string, b: string) { return `dm_${[a, b].sort().join('_')}`; }

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ nombre = '?', size = 'sm', online }: {
    nombre?: string; size?: 'sm' | 'md'; online?: boolean;
}) {
    const pal = [
        'bg-yellow-500/20 text-yellow-400 border-yellow-500/25',
        'bg-blue-500/20   text-blue-400   border-blue-500/25',
        'bg-purple-500/20 text-purple-400 border-purple-500/25',
        'bg-emerald-500/20text-emerald-400 border-emerald-500/25',
        'bg-red-500/20    text-red-400    border-red-500/25',
        'bg-pink-500/20   text-pink-400   border-pink-500/25',
    ];
    const n   = typeof nombre === 'string' && nombre.trim() ? nombre : '?';
    const col = pal[(n.charCodeAt(0) || 0) % pal.length];
    const sz  = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    return (
        <div className="relative shrink-0">
            <div className={cn('rounded-full flex items-center justify-center font-bold border', sz, col)}>
                {iniciales(n)}
            </div>
            {online !== undefined && (
                <span className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0a]',
                    online ? 'bg-emerald-400' : 'bg-zinc-600',
                )} />
            )}
        </div>
    );
}

// ─── Separador de fecha ───────────────────────────────────────────────────────

function SepFecha({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-white/6" />
            <span className="text-[10px] text-white/30 px-2 py-0.5 bg-white/4 rounded-full border border-white/8 whitespace-nowrap">
                {label}
            </span>
            <div className="flex-1 h-px bg-white/6" />
        </div>
    );
}

// ─── Tarjeta de evento ────────────────────────────────────────────────────────

function TarjetaEvento({ ev, esPropio }: { ev: EventoData; esPropio: boolean }) {
    return (
        <div className={cn(
            'rounded-2xl border overflow-hidden w-60',
            esPropio
                ? 'border-yellow-500/25 bg-yellow-500/6 rounded-tr-sm'
                : 'border-blue-500/25   bg-blue-500/6   rounded-tl-sm',
        )}>
            <div className={cn('flex items-center gap-2 px-3 py-2 border-b',
                esPropio ? 'border-yellow-500/15 bg-yellow-500/8' : 'border-blue-500/15 bg-blue-500/8')}>
                <Calendar className={cn('w-3.5 h-3.5', esPropio ? 'text-yellow-400' : 'text-blue-400')} />
                <span className="text-[11px] font-semibold text-white">Evento agendado</span>
            </div>
            <div className="px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold text-white">{ev.titulo}</p>
                <p className="text-[10px] text-white/55 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> {ev.fecha} · {ev.hora}
                </p>
                {ev.descripcion && <p className="text-[10px] text-white/40">{ev.descripcion}</p>}
                {ev.participantes?.length > 0 && (
                    <p className="text-[10px] text-white/30 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" /> {ev.participantes.length} participantes
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Burbuja de mensaje ───────────────────────────────────────────────────────

function Burbuja({ msg, esPropio, mostrarAvatar }: {
    msg: Mensaje; esPropio: boolean; mostrarAvatar: boolean;
}) {
    const leido = (msg.leido?.length ?? 0) > 1;
    return (
        <div className={cn('flex gap-2 mb-0.5', esPropio ? 'flex-row-reverse' : 'flex-row')}>
            <div className="w-8 shrink-0 flex items-end pb-4">
                {!esPropio && mostrarAvatar && <Avatar nombre={msg.autorNombre} size="sm" />}
            </div>
            <div className={cn('max-w-[72%] flex flex-col gap-0.5', esPropio ? 'items-end' : 'items-start')}>
                {!esPropio && mostrarAvatar && (
                    <span className="text-[10px] text-white/35 ml-1">{msg.autorNombre}</span>
                )}

                {msg.tipo === 'evento' && msg.eventoData ? (
                    <TarjetaEvento ev={msg.eventoData} esPropio={esPropio} />
                ) : msg.tipo === 'imagen' && msg.archivoUrl ? (
                    <div className={cn('rounded-2xl overflow-hidden border border-white/8 max-w-[220px]',
                        esPropio ? 'rounded-tr-sm' : 'rounded-tl-sm')}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.archivoUrl} alt={msg.archivoNombre || 'img'} className="max-h-48 w-full object-cover" />
                        {msg.texto && <div className="px-3 py-1.5 bg-white/5 text-[11px] text-white/70">{msg.texto}</div>}
                    </div>
                ) : msg.tipo === 'archivo' && msg.archivoUrl ? (
                    <a href={msg.archivoUrl} target="_blank" rel="noopener noreferrer"
                        className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border bg-white/4 hover:bg-white/8 transition-all',
                            esPropio ? 'border-white/10 rounded-tr-sm' : 'border-white/8 rounded-tl-sm')}>
                        <FileText className="w-4 h-4 text-yellow-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-xs text-white font-medium truncate max-w-[150px]">{msg.archivoNombre || 'Archivo'}</p>
                            <p className="text-[9px] text-white/35 mt-0.5">Toca para abrir</p>
                        </div>
                        <Download className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    </a>
                ) : (
                    <div className={cn('px-3 py-2 rounded-2xl text-[13px] leading-relaxed break-words',
                        esPropio
                            ? 'bg-yellow-500/15 border border-yellow-500/20 text-white rounded-tr-sm'
                            : 'bg-white/6 border border-white/8 text-white/90 rounded-tl-sm')}>
                        {msg.texto}
                    </div>
                )}

                <div className="flex items-center gap-1 px-1">
                    <span className="text-[9px] text-white/22">{fmtHora(msg.timestamp)}</span>
                    {esPropio && (leido
                        ? <CheckCheck className="w-3 h-3 text-yellow-400" />
                        : <Check      className="w-3 h-3 text-white/25"   />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Speed Dial ───────────────────────────────────────────────────────────────

function SpeedDial({ abierto, onAdjuntar, onRapidas, onEvento }: {
    abierto: boolean; onAdjuntar: () => void;
    onRapidas: () => void; onEvento: () => void;
}) {
    const items = [
        { icon: Calendar,  label: 'Agendar reunion',  cls: 'bg-blue-500/20 border-blue-500/30 text-blue-400',      fn: onEvento    },
        { icon: Zap,       label: 'Respuesta rapida', cls: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400', fn: onRapidas   },
        { icon: Paperclip, label: 'Adjuntar archivo', cls: 'bg-purple-500/20 border-purple-500/30 text-purple-400', fn: onAdjuntar  },
    ];
    return (
        <div className="absolute bottom-[3.6rem] left-0 flex flex-col-reverse gap-2 z-20">
            {items.map((item, i) => (
                <div key={i} className={cn(
                    'flex items-center gap-2 transition-all duration-300 ease-out',
                    abierto ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
                )} style={{ transitionDelay: abierto ? `${i * 55}ms` : '0ms' }}>
                    <span className="text-[10px] text-white/50 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/8 whitespace-nowrap select-none">
                        {item.label}
                    </span>
                    <button onClick={item.fn}
                        className={cn('w-9 h-9 rounded-full flex items-center justify-center border transition-all hover:scale-110 active:scale-95', item.cls)}>
                        <item.icon className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── Panel respuestas rápidas ─────────────────────────────────────────────────

function PanelRapidas({ onSeleccionar, onCerrar }: {
    onSeleccionar: (t: string) => void; onCerrar: () => void;
}) {
    return (
        <div className="absolute bottom-[3.8rem] left-11 right-0 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
                <span className="text-[11px] font-semibold text-white/50">Respuestas rapidas</span>
                <button onClick={onCerrar} className="p-1 hover:bg-white/8 rounded-lg">
                    <X className="w-3.5 h-3.5 text-white/40" />
                </button>
            </div>
            <div className="p-2 grid grid-cols-2 gap-1">
                {RESPUESTAS_RAPIDAS.map((r, i) => (
                    <button key={i} onClick={() => { onSeleccionar(r.texto); onCerrar(); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] text-white/60 hover:bg-white/8 hover:text-white transition-all text-left">
                        <span className="text-sm">{r.emoji}</span>
                        <span>{r.texto}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Modal Agendar Evento ─────────────────────────────────────────────────────

function ModalEvento({ onCerrar, onAgendar, usuarios, miUid }: {
    onCerrar: () => void; onAgendar: (d: EventoData) => void;
    usuarios: UsuarioOnline[]; miUid: string;
}) {
    const [form, setForm] = useState({
        titulo: '', fecha: new Date().toISOString().split('T')[0],
        hora: '10:00', descripcion: '', participantes: [] as string[],
    });
    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
    const toggle = (uid: string) => setForm(p => ({
        ...p, participantes: p.participantes.includes(uid)
            ? p.participantes.filter(u => u !== uid)
            : [...p.participantes, uid],
    }));

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-yellow-500" />
                        <h3 className="font-semibold text-sm">Agendar Reunion</h3>
                    </div>
                    <button onClick={onCerrar} className="p-1 hover:bg-white/8 rounded-lg">
                        <X className="w-4 h-4 text-white/40" />
                    </button>
                </div>
                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">Titulo *</label>
                        <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-500/40"
                            placeholder="Reunion de staff..."
                            value={form.titulo} onChange={e => set('titulo', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">Fecha</label>
                            <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/40"
                                value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">Hora</label>
                            <input type="time" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/40"
                                value={form.hora} onChange={e => set('hora', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">Descripcion</label>
                        <textarea rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-500/40 resize-none"
                            placeholder="Tema, agenda..."
                            value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
                    </div>
                    {usuarios.filter(u => u.uid !== miUid).length > 0 && (
                        <div>
                            <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-2">Participantes</label>
                            <div className="space-y-1">
                                {usuarios.filter(u => u.uid !== miUid).map(u => (
                                    <button key={u.uid} onClick={() => toggle(u.uid)}
                                        className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all',
                                            form.participantes.includes(u.uid)
                                                ? 'bg-yellow-500/12 border border-yellow-500/20 text-yellow-400'
                                                : 'bg-white/4 border border-transparent text-white/55 hover:bg-white/7')}>
                                        <Avatar nombre={u.nombre} size="sm" online={u.online} />
                                        <span className="flex-1 text-xs">{u.nombre}</span>
                                        <span className="text-[10px] opacity-50 capitalize">{u.rol}</span>
                                        {form.participantes.includes(u.uid) && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 p-4 border-t border-white/8">
                    <button onClick={onCerrar} className="flex-1 py-2 text-sm rounded-xl border border-white/10 text-white/45 hover:text-white/70 transition-all">
                        Cancelar
                    </button>
                    <button onClick={() => {
                        if (!form.titulo.trim()) { toast.error('Titulo requerido'); return; }
                        onAgendar(form); onCerrar();
                    }} className="flex-1 py-2 text-sm rounded-xl bg-yellow-500/15 border border-yellow-500/25 text-yellow-400 font-semibold hover:bg-yellow-500/25 transition-all">
                        Agendar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal Nuevo Grupo ────────────────────────────────────────────────────────

function ModalNuevoGrupo({ onCerrar, onCrear, usuarios, miUid, miNombre }: {
    onCerrar: () => void;
    onCrear:  (nombre: string, participantes: string[]) => void;
    usuarios: UsuarioOnline[];
    miUid:    string;
    miNombre: string;
}) {
    const [nombre, setNombre] = useState('');
    const [seleccionados, setSeleccionados] = useState<string[]>([]);
    const toggle = (uid: string) => setSeleccionados(p =>
        p.includes(uid) ? p.filter(u => u !== uid) : [...p, uid]
    );

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <h3 className="font-semibold text-sm">Nuevo grupo</h3>
                    </div>
                    <button onClick={onCerrar} className="p-1 hover:bg-white/8 rounded-lg">
                        <X className="w-4 h-4 text-white/40" />
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div>
                        <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">Nombre del grupo *</label>
                        <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/40"
                            placeholder="Ej: Equipo Academía, Marketing..."
                            value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
                    </div>
                    <div>
                        <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-2">
                            Agregar miembros ({seleccionados.length} seleccionados)
                        </label>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                            {usuarios.filter(u => u.uid !== miUid).map(u => (
                                <button key={u.uid} onClick={() => toggle(u.uid)}
                                    className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all',
                                        seleccionados.includes(u.uid)
                                            ? 'bg-blue-500/12 border border-blue-500/20 text-blue-400'
                                            : 'bg-white/4 border border-transparent text-white/55 hover:bg-white/7')}>
                                    <Avatar nombre={u.nombre} size="sm" online={u.online} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{u.nombre}</p>
                                        <p className="text-[10px] opacity-50 capitalize">{u.rol}</p>
                                    </div>
                                    {seleccionados.includes(u.uid)
                                        ? <Check className="w-3.5 h-3.5 shrink-0" />
                                        : <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                                    }
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 p-4 border-t border-white/8">
                    <button onClick={onCerrar} className="flex-1 py-2 text-sm rounded-xl border border-white/10 text-white/45 hover:text-white/70 transition-all">
                        Cancelar
                    </button>
                    <button onClick={() => {
                        if (!nombre.trim()) { toast.error('Ingresa un nombre'); return; }
                        if (seleccionados.length === 0) { toast.error('Selecciona al menos un miembro'); return; }
                        onCrear(nombre.trim(), seleccionados);
                        onCerrar();
                    }} className="flex-1 py-2 text-sm rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 font-semibold hover:bg-blue-500/25 transition-all">
                        Crear grupo
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Panel de miembros del canal ──────────────────────────────────────────────

function PanelMiembros({ canal, usuarios, onCerrar, miUid, onAgregarMiembro }: {
    canal: Canal; usuarios: UsuarioOnline[];
    onCerrar: () => void; miUid: string;
    onAgregarMiembro: (uid: string) => void;
}) {
    const miembros = usuarios.filter(u => canal.participantes.includes(u.uid));
    const fuera    = usuarios.filter(u => !canal.participantes.includes(u.uid) && u.uid !== miUid);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
                <button onClick={onCerrar} className="p-1.5 hover:bg-white/8 rounded-xl text-white/45 hover:text-white">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <p className="text-sm font-semibold text-white">Miembros del canal</p>
                    <p className="text-[10px] text-white/35">{miembros.length} participante{miembros.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Miembros actuales */}
                <div>
                    <p className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-2">
                        En este canal
                    </p>
                    <div className="space-y-1">
                        {miembros.map(u => (
                            <div key={u.uid} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3">
                                <Avatar nombre={u.nombre} size="sm" online={u.online} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-white/80 truncate">{u.nombre}</p>
                                    <p className="text-[10px] text-white/35 capitalize">{u.rol}</p>
                                </div>
                                <span className={cn('text-[10px] font-medium flex items-center gap-1',
                                    u.online ? 'text-emerald-400' : 'text-white/25')}>
                                    <Circle className={cn('w-1.5 h-1.5 fill-current', u.online ? 'text-emerald-400' : 'text-zinc-600')} />
                                    {u.online ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Agregar miembros */}
                {fuera.length > 0 && (
                    <div>
                        <p className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-2">
                            Agregar al canal
                        </p>
                        <div className="space-y-1">
                            {fuera.map(u => (
                                <button key={u.uid} onClick={() => onAgregarMiembro(u.uid)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/6 transition-all text-left">
                                    <Avatar nombre={u.nombre} size="sm" online={u.online} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-white/70 truncate">{u.nombre}</p>
                                        <p className="text-[10px] text-white/35 capitalize">{u.rol}</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
                                        <UserPlus className="w-3 h-3" />
                                        Agregar
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Vista de mensajes ────────────────────────────────────────────────────────

function VistaMensajes({ canal, miUid, miNombre, miRol, usuarios, onVolver }: {
    canal: Canal; miUid: string; miNombre: string; miRol: string;
    usuarios: UsuarioOnline[]; onVolver: () => void;
}) {
    const [mensajes,      setMensajes]      = useState<Mensaje[]>([]);
    const [texto,         setTexto]         = useState('');
    const [enviando,      setEnviando]      = useState(false);
    const [speedDial,     setSpeedDial]     = useState(false);
    const [showRapidas,   setShowRapidas]   = useState(false);
    const [showEvento,    setShowEvento]    = useState(false);
    const [showMiembros,  setShowMiembros]  = useState(false);
    const [cargando,      setCargando]      = useState(true);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef  = useRef<HTMLTextAreaElement>(null);
    const fileRef   = useRef<HTMLInputElement>(null);

    const otroUsuario = canal.tipo === 'dm'
        ? usuarios.find(u => u.uid === canal.participantes.find(p => p !== miUid))
        : null;

    const nombreCanal =
        canal.tipo === 'general' ? 'Staff Atempo' :
        canal.tipo === 'grupo'   ? (canal.nombre || 'Grupo') :
        otroUsuario?.nombre      ?? 'Chat';

    // ── Listener mensajes (últimos 30 días, SIN orderBy para evitar índice) ──
    useEffect(() => {
        const hace30 = new Date();
        hace30.setDate(hace30.getDate() - 30);

        const q = query(
            collection(db, 'chat_mensajes'),
            where('canalId',   '==', canal.id),
            where('timestamp', '>=', Timestamp.fromDate(hace30)),
        );

        const unsub = onSnapshot(q, snap => {
            // Ordenar en el cliente para evitar índice compuesto en Firestore
            const msgs = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Mensaje))
                .filter(m => m.timestamp) // ignorar docs sin timestamp (recien enviados)
                .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

            setMensajes(msgs);
            setCargando(false);

            // Marcar como leídos
            msgs.forEach(m => {
                if (m.autorId !== miUid && !(m.leido ?? []).includes(miUid)) {
                    updateDoc(doc(db, 'chat_mensajes', m.id), {
                        leido: [...(m.leido ?? []), miUid],
                    }).catch(() => {});
                }
            });
            // Reset contador
            updateDoc(doc(db, 'chat_canales', canal.id), {
                [`noLeidos.${miUid}`]: 0,
            }).catch(() => {});
        }, err => {
            console.warn('msgs:', err.message);
            setCargando(false);
        });

        return unsub;
    }, [canal.id, miUid]);

    // Scroll al fondo
    useEffect(() => {
        if (!cargando) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    }, [mensajes.length, cargando]);

    // ── Enviar ────────────────────────────────────────────────────────────────
    const enviar = useCallback(async (
        tipo: TipoMensaje = 'texto',
        textoOverride?: string,
        extras?: Partial<Mensaje>,
    ) => {
        const contenido = textoOverride ?? texto.trim();
        if (!contenido && tipo === 'texto') return;
        setEnviando(true);
        setTexto('');
        try {
            await addDoc(collection(db, 'chat_mensajes'), {
                canalId:     canal.id,
                autorId:     miUid,
                autorNombre: miNombre,
                autorRol:    miRol,
                texto:       contenido,
                tipo,
                leido:       [miUid],
                timestamp:   serverTimestamp(),
                ...(extras ?? {}),
            });

            const canalRef  = doc(db, 'chat_canales', canal.id);
            const canalSnap = await getDoc(canalRef);
            const noLeidos: Record<string, number> = {};
            (canal.participantes || []).forEach(uid => {
                noLeidos[uid] = uid === miUid ? 0
                    : (canalSnap.exists() ? (canalSnap.data().noLeidos?.[uid] ?? 0) : 0) + 1;
            });
            await setDoc(canalRef, {
                ultimoMensaje:   tipo === 'evento' ? '📅 Evento agendado' : contenido.slice(0, 60),
                ultimoTimestamp: serverTimestamp(),
                noLeidos,
            }, { merge: true });

        } catch (err) {
            console.error('enviar:', err);
            toast.error('Error al enviar');
        } finally {
            setEnviando(false);
            inputRef.current?.focus();
        }
    }, [canal, miUid, miNombre, miRol, texto]);

    // ── Adjuntar archivo (base64, máx 800KB) ─────────────────────────────────
    const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 800 * 1024) {
            toast.error('El archivo supera 800KB. Comparte el link externo.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async ev => {
            const base64 = ev.target?.result as string;
            await enviar(
                file.type.startsWith('image/') ? 'imagen' : 'archivo',
                file.type.startsWith('image/') ? '' : file.name,
                {
                    archivoUrl:    base64,
                    archivoNombre: file.name,
                    archivoTipo:   file.type.startsWith('image/') ? 'imagen'
                                   : file.type === 'application/pdf' ? 'pdf' : 'otro',
                },
            );
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // ── Agendar evento ────────────────────────────────────────────────────────
    const handleAgendar = async (evData: EventoData) => {
        try {
            await addDoc(collection(db, 'agenda'), {
                titulo:        evData.titulo,
                fecha:         evData.fecha,
                hora:          evData.hora,
                descripcion:   evData.descripcion,
                participantes: [miUid, ...evData.participantes],
                creadoPor:     miUid,
                origen:        'chat',
                canalId:       canal.id,
                createdAt:     serverTimestamp(),
            });
        } catch (e) { console.warn('agenda:', e); }
        await enviar('evento', evData.titulo, { eventoData: evData });
        toast.success('Reunion agendada ✅');
    };

    // ── Agregar miembro al canal ──────────────────────────────────────────────
    const handleAgregarMiembro = async (uid: string) => {
        const u = usuarios.find(x => x.uid === uid);
        if (!u) return;
        await updateDoc(doc(db, 'chat_canales', canal.id), {
            participantes:         [...canal.participantes, uid],
            [`nombres.${uid}`]:    u.nombre,
            [`noLeidos.${uid}`]:   0,
        });
        toast.success(`${u.nombre} agregado al canal`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
    };

    // Mostrar panel de miembros en lugar del chat
    if (showMiembros) {
        return (
            <PanelMiembros
                canal={canal}
                usuarios={usuarios}
                onCerrar={() => setShowMiembros(false)}
                miUid={miUid}
                onAgregarMiembro={handleAgregarMiembro}
            />
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header del canal */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
                <button onClick={onVolver}
                    className="p-1.5 hover:bg-white/8 rounded-xl text-white/45 hover:text-white">
                    <ArrowLeft className="w-4 h-4" />
                </button>

                {canal.tipo === 'general' || canal.tipo === 'grupo' ? (
                    <div className="w-8 h-8 rounded-full bg-yellow-500/12 border border-yellow-500/22 flex items-center justify-center shrink-0">
                        {canal.tipo === 'grupo'
                            ? <Users className="w-4 h-4 text-blue-400" />
                            : <Hash  className="w-4 h-4 text-yellow-500" />
                        }
                    </div>
                ) : (
                    <Avatar nombre={nombreCanal} size="sm" online={otroUsuario?.online} />
                )}

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{nombreCanal}</p>
                    <p className="text-[10px] text-white/30">
                        {canal.tipo === 'dm'
                            ? otroUsuario?.online ? '🟢 En linea' : '⚫ Desconectado'
                            : `${canal.participantes?.length ?? 0} miembros`
                        }
                    </p>
                </div>

                {/* Ver miembros */}
                {canal.tipo !== 'dm' && (
                    <button onClick={() => setShowMiembros(true)}
                        className="p-1.5 hover:bg-white/8 rounded-xl text-white/35 hover:text-white transition-all"
                        title="Ver miembros">
                        <Users className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
                {cargando ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                        <p className="text-[11px] text-white/25">Cargando mensajes...</p>
                    </div>
                ) : mensajes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                        <MessageSquare className="w-10 h-10 text-white/8" />
                        <p className="text-xs text-white/22">
                            {canal.tipo === 'dm'
                                ? `Inicia una conversacion con ${nombreCanal}`
                                : `Se el primero en escribir en ${nombreCanal}`}
                        </p>
                    </div>
                ) : (
                    <>
                        {mensajes.map((m, i) => {
                            const prev  = mensajes[i - 1];
                            const sepFecha = !prev || (m.timestamp && prev.timestamp &&
                                fmtSeparador(m.timestamp) !== fmtSeparador(prev.timestamp));
                            const mismo = prev?.autorId === m.autorId;
                            return (
                                <div key={m.id}>
                                    {(i === 0 || sepFecha) && m.timestamp && (
                                        <SepFecha label={fmtSeparador(m.timestamp)} />
                                    )}
                                    <Burbuja
                                        msg={m}
                                        esPropio={m.autorId === miUid}
                                        mostrarAvatar={!mismo}
                                    />
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 pb-3 pt-2 border-t border-white/8 relative">

                <SpeedDial
                    abierto={speedDial}
                    onAdjuntar={() => { setSpeedDial(false); fileRef.current?.click(); }}
                    onRapidas={() => { setSpeedDial(false); setShowRapidas(true); }}
                    onEvento={() => { setSpeedDial(false); setShowEvento(true); }}
                />

                {showRapidas && (
                    <PanelRapidas
                        onSeleccionar={t => { setTexto(t); setShowRapidas(false); }}
                        onCerrar={() => setShowRapidas(false)}
                    />
                )}

                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleArchivo} />

                <div className="flex items-end gap-2">
                    {/* Botón + Speed Dial */}
                    <button
                        onClick={() => { setSpeedDial(p => !p); setShowRapidas(false); }}
                        className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300',
                            speedDial
                                ? 'bg-yellow-500/18 border-yellow-500/35 text-yellow-400 rotate-45'
                                : 'bg-white/5 border-white/10 text-white/45 hover:text-white/70',
                        )}>
                        <Plus className="w-4 h-4 transition-transform duration-300" />
                    </button>

                    <textarea ref={inputRef} rows={1}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-[13px] text-white placeholder-white/22 outline-none focus:border-white/18 resize-none max-h-28 leading-relaxed"
                        placeholder="Escribe un mensaje..."
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{ minHeight: '40px' }}
                        onInput={e => {
                            const t = e.target as HTMLTextAreaElement;
                            t.style.height = 'auto';
                            t.style.height = Math.min(t.scrollHeight, 112) + 'px';
                        }}
                    />

                    <button onClick={() => enviar()}
                        disabled={!texto.trim() || enviando}
                        className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all duration-200',
                            texto.trim() && !enviando
                                ? 'bg-yellow-500/18 border-yellow-500/28 text-yellow-400 hover:bg-yellow-500/28 hover:scale-105'
                                : 'bg-white/4 border-white/7 text-white/18 cursor-not-allowed',
                        )}>
                        {enviando
                            ? <div className="w-3.5 h-3.5 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
                            : <Send className="w-4 h-4" />
                        }
                    </button>
                </div>

                <p className="text-[9px] text-white/12 text-center mt-1.5">
                    Enter para enviar · Shift+Enter para salto · Archivos max 800KB
                </p>
            </div>

            {showEvento && (
                <ModalEvento
                    onCerrar={() => setShowEvento(false)}
                    onAgendar={handleAgendar}
                    usuarios={usuarios}
                    miUid={miUid}
                />
            )}
        </div>
    );
}

// ─── Lista de canales ─────────────────────────────────────────────────────────

function ListaCanales({ canales, usuarios, miUid, miNombre, miRol, onSeleccionar, onNuevoGrupo }: {
    canales: Canal[]; usuarios: UsuarioOnline[];
    miUid: string; miNombre: string; miRol: string;
    onSeleccionar: (c: Canal) => void;
    onNuevoGrupo: () => void;
}) {
    const [busqueda, setBusqueda] = useState('');

    const filtrados = canales.filter(c => {
        if (!busqueda) return true;
        if (c.tipo === 'general') return 'staff atempo'.includes(busqueda.toLowerCase());
        if (c.tipo === 'grupo')   return (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
        const otro = Object.entries(c.nombres || {}).find(([uid]) => uid !== miUid)?.[1] ?? '';
        return otro.toLowerCase().includes(busqueda.toLowerCase());
    });

    // Usuarios sin DM existente
    const usuariosSinDM = usuarios.filter(u =>
        u.uid !== miUid &&
        !canales.some(c => c.id === dmId(miUid, u.uid))
    );

    return (
        <div className="flex flex-col h-full">
            {/* Buscador */}
            <div className="px-3 pt-3 pb-2 space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                    <input
                        className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-3 py-2 text-[12px] text-white placeholder-white/22 outline-none focus:border-white/18"
                        placeholder="Buscar conversacion..."
                        value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                {/* Botón nuevo grupo */}
                <button onClick={onNuevoGrupo}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/8 border border-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/15 transition-all">
                    <UserPlus className="w-3.5 h-3.5" />
                    Crear nuevo grupo
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Canales existentes */}
                {filtrados.map(canal => {
                    const noLeidos = canal.noLeidos?.[miUid] ?? 0;
                    const otro = canal.tipo === 'dm'
                        ? usuarios.find(u => u.uid === canal.participantes.find(p => p !== miUid))
                        : null;
                    const nombre =
                        canal.tipo === 'general' ? 'Staff Atempo' :
                        canal.tipo === 'grupo'   ? (canal.nombre || 'Grupo') :
                        otro?.nombre             ?? 'Usuario';

                    return (
                        <button key={canal.id} onClick={() => onSeleccionar(canal)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition-all text-left">
                            {canal.tipo === 'general' ? (
                                <div className="w-9 h-9 rounded-full bg-yellow-500/12 border border-yellow-500/22 flex items-center justify-center shrink-0">
                                    <Hash className="w-4 h-4 text-yellow-500" />
                                </div>
                            ) : canal.tipo === 'grupo' ? (
                                <div className="w-9 h-9 rounded-full bg-blue-500/12 border border-blue-500/22 flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 text-blue-400" />
                                </div>
                            ) : (
                                <Avatar nombre={otro?.nombre ?? 'U'} size="sm" online={otro?.online} />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className={cn('text-[13px] font-medium truncate', noLeidos > 0 ? 'text-white' : 'text-white/65')}>
                                        {nombre}
                                    </span>
                                    {canal.ultimoTimestamp && (
                                        <span className="text-[10px] text-white/22 shrink-0 ml-2">
                                            {fmtHora(canal.ultimoTimestamp)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-white/30 truncate flex-1 pr-2">
                                        {canal.ultimoMensaje || 'Sin mensajes'}
                                    </span>
                                    {noLeidos > 0 && (
                                        <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-yellow-500 text-black text-[9px] font-bold flex items-center justify-center px-1">
                                            {noLeidos > 9 ? '9+' : noLeidos}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}

                {/* DMs nuevos */}
                {usuariosSinDM.length > 0 && (
                    <>
                        <div className="px-4 pt-3 pb-1">
                            <p className="text-[10px] text-white/22 uppercase tracking-wider font-medium">
                                Mensaje directo
                            </p>
                        </div>
                        {usuariosSinDM.map(u => (
                            <button key={u.uid}
                                onClick={() => onSeleccionar({
                                    id:              dmId(miUid, u.uid),
                                    tipo:            'dm',
                                    participantes:   [miUid, u.uid],
                                    nombres:         { [miUid]: miNombre, [u.uid]: u.nombre },
                                    ultimoMensaje:   '',
                                    ultimoTimestamp: null,
                                    noLeidos:        {},
                                })}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/4 transition-all text-left">
                                <Avatar nombre={u.nombre} size="sm" online={u.online} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] text-white/55">{u.nombre}</p>
                                    <p className="text-[10px] text-white/25 capitalize">{u.rol}</p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-white/18" />
                            </button>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function InternalChatPanel({ abierto, onCerrar }: {
    abierto: boolean; onCerrar: () => void;
}) {
    const { perfil, usuario } = useAuth() as any;
    const [canales,       setCanales]      = useState<Canal[]>([]);
    const [usuarios,      setUsuarios]     = useState<UsuarioOnline[]>([]);
    const [canalActivo,   setCanalActivo]  = useState<Canal | null>(null);
    const [cargandoInit,  setCargandoInit] = useState(true);
    const [showNuevoGrupo,setShowNuevoGrupo] = useState(false);

    const miUid    = perfil?.uid    || usuario?.uid    || '';
    const miNombre = perfil?.nombre || usuario?.email  || 'Usuario';
    const miRol    = perfil?.rol    || 'staff';

    // ── Listener canales ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!miUid) return;

        const unsub = onSnapshot(
            query(collection(db, 'chat_canales'), where('participantes', 'array-contains', miUid)),
            snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Canal));
                // General primero, luego por último mensaje
                data.sort((a, b) => {
                    if (a.tipo === 'general') return -1;
                    if (b.tipo === 'general') return 1;
                    return (b.ultimoTimestamp?.toMillis() ?? 0) - (a.ultimoTimestamp?.toMillis() ?? 0);
                });
                setCanales(data);
                setCargandoInit(false);

                // Auto-crear/unirse al canal general
                const general = data.find(c => c.id === 'general');
                if (!general) {
                    setDoc(doc(db, 'chat_canales', 'general'), {
                        tipo:            'general',
                        participantes:   [miUid],
                        nombres:         { [miUid]: miNombre },
                        ultimoMensaje:   '',
                        ultimoTimestamp: null,
                        noLeidos:        {},
                    }, { merge: true }).catch(() => {});
                } else if (!general.participantes.includes(miUid)) {
                    updateDoc(doc(db, 'chat_canales', 'general'), {
                        participantes:         [...general.participantes, miUid],
                        [`nombres.${miUid}`]:  miNombre,
                        [`noLeidos.${miUid}`]: 0,
                    }).catch(() => {});
                }
            },
            err => { console.warn('canales:', err.message); setCargandoInit(false); },
        );
        return unsub;
    }, [miUid, miNombre]);

    // ── Presencia online + staff ──────────────────────────────────────────────
    useEffect(() => {
        if (!miUid) return;

        const unsub = onSnapshot(
            collection(db, 'clientes_staff'),
            snap => setUsuarios(snap.docs.map(d => ({
                uid:    d.id,
                nombre: d.data().nombre ?? 'Usuario',
                rol:    d.data().rol    ?? 'staff',
                online: d.data().online ?? false,
            }))),
            () => {},
        );

        setDoc(doc(db, 'clientes_staff', miUid), {
            nombre: miNombre, rol: miRol,
            online: true, ultimaVez: serverTimestamp(),
        }, { merge: true }).catch(() => {});

        const goOffline = () => setDoc(doc(db, 'clientes_staff', miUid),
            { online: false, ultimaVez: serverTimestamp() }, { merge: true }).catch(() => {});

        window.addEventListener('beforeunload', goOffline);
        return () => {
            unsub();
            window.removeEventListener('beforeunload', goOffline);
            goOffline();
        };
    }, [miUid, miNombre, miRol]);

    // ── Crear nuevo grupo ─────────────────────────────────────────────────────
    const crearGrupo = async (nombre: string, participantes: string[]) => {
        const todos    = [miUid, ...participantes];
        const nombres: Record<string, string> = { [miUid]: miNombre };
        participantes.forEach(uid => {
            const u = usuarios.find(x => x.uid === uid);
            if (u) nombres[uid] = u.nombre;
        });
        const noLeidos: Record<string, number> = {};
        todos.forEach(uid => { noLeidos[uid] = 0; });

        const ref = await addDoc(collection(db, 'chat_canales'), {
            tipo:            'grupo',
            nombre,
            participantes:   todos,
            nombres,
            ultimoMensaje:   '',
            ultimoTimestamp: null,
            noLeidos,
        });
        toast.success(`Grupo "${nombre}" creado`);
        // Abrir el grupo recién creado
        setCanalActivo({
            id: ref.id, tipo: 'grupo', nombre,
            participantes: todos, nombres,
            ultimoMensaje: '', ultimoTimestamp: null, noLeidos,
        });
    };

    const totalNoLeidos = canales.reduce((s, c) => s + (c.noLeidos?.[miUid] ?? 0), 0);

    if (!miUid) return null;

    return (
        <>
            {/* Overlay */}
            <div className={cn(
                'fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 transition-opacity duration-500',
                abierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
            )} onClick={onCerrar} />

            {/* Panel */}
            <div className={cn(
                'fixed top-0 right-0 h-full w-full sm:w-[380px] z-50 flex flex-col',
                'bg-[#0a0a0a] border-l border-white/8',
                'transition-transform duration-500 ease-in-out will-change-transform',
                abierto ? 'translate-x-0' : 'translate-x-full',
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/8 shrink-0 bg-black/30 backdrop-blur-xl">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/18 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-[13px] font-semibold text-white leading-tight">Mensajes</h2>
                            <p className="text-[10px] text-white/30">
                                {totalNoLeidos > 0 ? `${totalNoLeidos} sin leer` : 'ATEMPO Staff'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onCerrar}
                        className="p-1.5 hover:bg-white/8 rounded-xl text-white/40 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-hidden">
                    {cargandoInit ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <div className="w-8 h-8 border-2 border-yellow-500/15 border-t-yellow-500 rounded-full animate-spin" />
                            <p className="text-[11px] text-white/25">Conectando...</p>
                        </div>
                    ) : canalActivo ? (
                        <VistaMensajes
                            canal={canalActivo}
                            miUid={miUid}
                            miNombre={miNombre}
                            miRol={miRol}
                            usuarios={usuarios}
                            onVolver={() => setCanalActivo(null)}
                        />
                    ) : (
                        <ListaCanales
                            canales={canales}
                            usuarios={usuarios}
                            miUid={miUid}
                            miNombre={miNombre}
                            miRol={miRol}
                            onSeleccionar={setCanalActivo}
                            onNuevoGrupo={() => setShowNuevoGrupo(true)}
                        />
                    )}
                </div>

                {/* Footer — perfil propio */}
                {!canalActivo && (
                    <div className="shrink-0 px-4 py-3 border-t border-white/8">
                        <div className="flex items-center gap-2.5">
                            <Avatar nombre={miNombre} size="sm" online={true} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-white/65 truncate">{miNombre}</p>
                                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                    En linea
                                </p>
                            </div>
                            <span className="text-[10px] text-white/22 capitalize">{miRol}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal nuevo grupo */}
            {showNuevoGrupo && (
                <ModalNuevoGrupo
                    onCerrar={() => setShowNuevoGrupo(false)}
                    onCrear={crearGrupo}
                    usuarios={usuarios}
                    miUid={miUid}
                    miNombre={miNombre}
                />
            )}
        </>
    );
}

// ─── Hook badge no leídos ─────────────────────────────────────────────────────

export function useChatNoLeidos(uid: string | undefined): number {
    const [total, setTotal] = useState(0);
    const { usuario } = useAuth() as any;
    const miUid = uid || usuario?.uid;

    useEffect(() => {
        if (!miUid) return;
        const unsub = onSnapshot(
            query(collection(db, 'chat_canales'), where('participantes', 'array-contains', miUid)),
            snap => setTotal(snap.docs.reduce((s, d) => s + (d.data().noLeidos?.[miUid] ?? 0), 0)),
            () => {},
        );
        return unsub;
    }, [miUid]);

    return total;
}
