'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    collection, query, where, onSnapshot,
    addDoc, updateDoc, doc, serverTimestamp, Timestamp,
    setDoc, getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
    X, Send, Plus, Paperclip, Zap, Calendar,
    MessageSquare, Users, ArrowLeft, Hash,
    CheckCheck, Check, Search, FileText,
    Download, ChevronRight,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoMensaje = 'texto' | 'imagen' | 'archivo' | 'evento' | 'respuesta_rapida';

interface Mensaje {
    id:             string;
    canalId:        string;
    autorId:        string;
    autorNombre?:   string;
    autorRol?:      string;
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
    tipo:            'general' | 'dm';
    participantes:   string[];
    nombres?:        Record<string, string>;
    ultimoMensaje?:  string;
    ultimoTimestamp: Timestamp | null;
    noLeidos?:       Record<string, number>;
}

interface UsuarioOnline {
    uid:    string;
    nombre: string;
    rol:    string;
    online: boolean;
}

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

function formatHora(ts: Timestamp | null): string {
    if (!ts) return '';
    return ts.toDate().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

function formatFechaSeparador(ts: Timestamp): string {
    const d    = ts.toDate();
    const hoy  = new Date();
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    if (d.toDateString() === hoy.toDateString())  return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
}

function iniciales(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();
}

function dmCanalId(uid1: string, uid2: string): string {
    return `dm_${[uid1, uid2].sort().join('_')}`;
}

function Avatar({ nombre = '?', size = 'sm', online }: { nombre?: string; size?: 'sm' | 'md'; online?: boolean }) {
    const paleta = [
        'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
        'bg-blue-500/20 text-blue-400 border-blue-500/20',
        'bg-purple-500/20 text-purple-400 border-purple-500/20',
        'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
        'bg-red-500/20 text-red-400 border-red-500/20',
    ];
    const strSeguro = typeof nombre === 'string' && nombre.trim() !== '' ? nombre : '?';
    const color = paleta[(strSeguro.charCodeAt(0) || 0) % paleta.length];
    const sz    = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    return (
        <div className="relative shrink-0">
            <div className={cn('rounded-full flex items-center justify-center font-bold border', sz, color)}>
                {iniciales(strSeguro)}
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

function SeparadorFecha({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 my-3 px-1">
            <div className="flex-1 h-px bg-white/6" />
            <span className="text-[10px] text-white/30 font-medium px-2 py-0.5 bg-white/4 rounded-full border border-white/8 whitespace-nowrap">
                {label}
            </span>
            <div className="flex-1 h-px bg-white/6" />
        </div>
    );
}

function TarjetaEvento({ evento, esPropio }: { evento: EventoData; esPropio: boolean }) {
    return (
        <div className={cn(
            'rounded-2xl border overflow-hidden w-60',
            esPropio ? 'border-yellow-500/25 bg-yellow-500/6 rounded-tr-sm' : 'border-blue-500/25 bg-blue-500/6 rounded-tl-sm',
        )}>
            <div className={cn(
                'flex items-center gap-2 px-3 py-2 border-b',
                esPropio ? 'border-yellow-500/15 bg-yellow-500/8' : 'border-blue-500/15 bg-blue-500/8',
            )}>
                <Calendar className={cn('w-3.5 h-3.5 shrink-0', esPropio ? 'text-yellow-400' : 'text-blue-400')} />
                <span className="text-[11px] font-semibold text-white">Evento agendado</span>
            </div>
            <div className="px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold text-white leading-tight">{evento.titulo}</p>
                <p className="text-[10px] text-white/55 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{evento.fecha} · {evento.hora}</p>
                {evento.descripcion && <p className="text-[10px] text-white/40 leading-relaxed">{evento.descripcion}</p>}
            </div>
        </div>
    );
}

function BurbujaMensaje({ msg, esPropio, mostrarAvatar }: { msg: Mensaje; esPropio: boolean; mostrarAvatar: boolean; }) {
    const leido = (msg.leido?.length ?? 0) > 1;
    return (
        <div className={cn('flex gap-2 mb-0.5', esPropio ? 'flex-row-reverse' : 'flex-row')}>
            <div className="w-8 shrink-0 flex items-end pb-4">
                {!esPropio && mostrarAvatar && <Avatar nombre={msg.autorNombre} size="sm" />}
            </div>
            <div className={cn('max-w-[72%] flex flex-col gap-0.5', esPropio ? 'items-end' : 'items-start')}>
                {!esPropio && mostrarAvatar && <span className="text-[10px] text-white/35 ml-1">{msg.autorNombre || 'Usuario'}</span>}
                {msg.tipo === 'evento' && msg.eventoData ? (
                    <TarjetaEvento evento={msg.eventoData} esPropio={esPropio} />
                ) : msg.tipo === 'imagen' && msg.archivoUrl ? (
                    <div className={cn('rounded-2xl overflow-hidden border border-white/8 max-w-[220px]', esPropio ? 'rounded-tr-sm' : 'rounded-tl-sm')}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.archivoUrl} alt="img" className="max-h-48 w-full object-cover" />
                    </div>
                ) : msg.tipo === 'archivo' && msg.archivoUrl ? (
                    <a href={msg.archivoUrl} target="_blank" rel="noopener noreferrer" className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border bg-white/4', esPropio ? 'border-white/10 rounded-tr-sm' : 'border-white/8 rounded-tl-sm')}>
                        <FileText className="w-4 h-4 text-yellow-400 shrink-0" />
                        <div className="min-w-0"><p className="text-xs text-white font-medium truncate max-w-[150px]">{msg.archivoNombre || 'Archivo'}</p></div>
                        <Download className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    </a>
                ) : (
                    <div className={cn('px-3 py-2 rounded-2xl text-[13px] leading-relaxed break-words', esPropio ? 'bg-yellow-500/15 border border-yellow-500/20 text-white rounded-tr-sm' : 'bg-white/6 border border-white/8 text-white/88 rounded-tl-sm')}>
                        {msg.texto}
                    </div>
                )}
                <div className="flex items-center gap-1 px-1">
                    <span className="text-[9px] text-white/22">{formatHora(msg.timestamp)}</span>
                    {esPropio && (leido ? <CheckCheck className="w-3 h-3 text-yellow-400" /> : <Check className="w-3 h-3 text-white/25" />)}
                </div>
            </div>
        </div>
    );
}

function VistaMensajes({ canal, miUid, miNombre, miRol, usuarios, onVolver }: {
    canal: Canal; miUid: string; miNombre: string; miRol: string; usuarios: UsuarioOnline[]; onVolver: () => void;
}) {
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [cargando, setCargando] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const nombreCanal = canal.tipo === 'general' ? 'Staff Atempo' : Object.entries(canal.nombres || {}).find(([uid]) => uid !== miUid)?.[1] ?? 'Chat';
    const otroUsuario = canal.tipo === 'dm' ? usuarios.find(u => u.uid === (canal.participantes || []).find(p => p !== miUid)) : null;

    useEffect(() => {
        // Bypass maestro: Consultamos sin filtros complejos y resolvemos en JS para evitar los Índices de Firebase
        const q = query(collection(db, 'chat_mensajes'), where('canalId', '==', canal.id));
        const hace30Millis = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);

        const unsub = onSnapshot(q, snap => {
            let msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Mensaje));
            // Filtro de 30 días y ordenamiento en memoria
            msgs = msgs.filter(m => (m.timestamp?.toMillis() ?? Date.now()) >= hace30Millis);
            msgs.sort((a, b) => (a.timestamp?.toMillis() ?? 0) - (b.timestamp?.toMillis() ?? 0));
            
            setMensajes(msgs);
            setCargando(false);

            msgs.forEach(m => {
                if (m.autorId !== miUid && !(m.leido ?? []).includes(miUid)) {
                    updateDoc(doc(db, 'chat_mensajes', m.id), { leido: [...(m.leido ?? []), miUid] }).catch(() => {});
                }
            });
            updateDoc(doc(db, 'chat_canales', canal.id), { [`noLeidos.${miUid}`]: 0 }).catch(() => {});
        }, () => setCargando(false));
        return unsub;
    }, [canal.id, miUid]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

    const enviarMensaje = async () => {
        const contenido = texto.trim();
        if (!contenido) return;
        setEnviando(true); setTexto('');
        try {
            await addDoc(collection(db, 'chat_mensajes'), {
                canalId: canal.id, autorId: miUid, autorNombre: miNombre, autorRol: miRol,
                texto: contenido, tipo: 'texto', leido: [miUid], timestamp: serverTimestamp()
            });
            const canalRef = doc(db, 'chat_canales', canal.id);
            const canalSnap = await getDoc(canalRef);
            const noLeidos: Record<string, number> = {};
            (canal.participantes || []).forEach(uid => {
                noLeidos[uid] = uid === miUid ? 0 : (canalSnap.exists() ? (canalSnap.data().noLeidos?.[uid] ?? 0) : 0) + 1;
            });
            await setDoc(canalRef, {
                ultimoMensaje: contenido.slice(0, 60), ultimoTimestamp: serverTimestamp(), noLeidos
            }, { merge: true });
        } catch (e) { toast.error('Error'); } finally { setEnviando(false); }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
                <button onClick={onVolver} className="p-1.5 hover:bg-white/8 rounded-xl transition-all text-white/45 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
                {canal.tipo === 'general' ? <div className="w-8 h-8 rounded-full bg-yellow-500/12 border border-yellow-500/22 flex items-center justify-center shrink-0"><Hash className="w-4 h-4 text-yellow-500" /></div> : <Avatar nombre={nombreCanal} size="sm" online={otroUsuario?.online} />}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{nombreCanal}</p>
                    <p className="text-[10px] text-white/30">{canal.tipo === 'general' ? 'Retención: 30 días' : otroUsuario?.online ? '🟢 En linea' : '⚫ Desconectado'}</p>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
                {cargando ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"/></div> : mensajes.map((m, i) => {
                    const previo = mensajes[i - 1];
                    const diff = m.timestamp && previo?.timestamp && formatFechaSeparador(m.timestamp) !== formatFechaSeparador(previo.timestamp);
                    return (
                        <div key={m.id}>
                            {(i === 0 || diff) && m.timestamp && <SeparadorFecha label={formatFechaSeparador(m.timestamp)} />}
                            <BurbujaMensaje msg={m} esPropio={m.autorId === miUid} mostrarAvatar={m.autorId !== previo?.autorId} />
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>
            <div className="shrink-0 px-3 pb-3 pt-2 border-t border-white/8 flex items-end gap-2">
                <textarea rows={1} className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-[13px] text-white resize-none" placeholder="Escribe un mensaje..." value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } }} />
                <button onClick={enviarMensaje} disabled={!texto.trim() || enviando} className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all', texto.trim() && !enviando ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/20')}><Send className="w-4 h-4" /></button>
            </div>
        </div>
    );
}

// ─── COMPONENTE PRINCIPAL BLINDADO ────────────────────────────────────────────

export function InternalChatPanel({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void; }) {
    const { perfil, usuario } = useAuth() as any;
    const [canales, setCanales] = useState<Canal[]>([]);
    const [usuarios, setUsuarios] = useState<UsuarioOnline[]>([]);
    const [canalActivo, setCanalActivo] = useState<Canal | null>(null);
    const [cargandoInit, setCargandoInit] = useState(true);

    // Bóveda de seguridad: Extraemos datos directo de la sesión dura de Firebase
    const miUid = perfil?.uid || usuario?.uid;
    const miNombre = perfil?.nombre || usuario?.email || 'Usuario';
    const miRol = perfil?.rol || 'staff';

    useEffect(() => {
        if (!miUid) return;
        const unsub = onSnapshot(query(collection(db, 'chat_canales'), where('participantes', 'array-contains', miUid)), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Canal));
            data.sort((a, b) => (b.ultimoTimestamp?.toMillis() ?? 0) - (a.ultimoTimestamp?.toMillis() ?? 0));
            setCanales(data); setCargandoInit(false);

            const general = data.find(c => c.id === 'general');
            if (!general) {
                setDoc(doc(db, 'chat_canales', 'general'), { tipo: 'general', participantes: [miUid], nombres: { [miUid]: miNombre }, ultimoMensaje: '', ultimoTimestamp: null, noLeidos: {} }, { merge: true }).catch(()=>{});
            } else if (!(general.participantes || []).includes(miUid)) {
                updateDoc(doc(db, 'chat_canales', 'general'), { participantes: [...(general.participantes || []), miUid], [`nombres.${miUid}`]: miNombre }).catch(()=>{});
            }
        }, err => setCargandoInit(false));
        return unsub;
    }, [miUid, miNombre]);

    useEffect(() => {
        if (!miUid) return;
        const unsub = onSnapshot(collection(db, 'clientes_staff'), snap => setUsuarios(snap.docs.map(d => ({ uid: d.id, nombre: d.data().nombre ?? 'Usuario', rol: d.data().rol ?? 'staff', online: d.data().online ?? false }))));
        setDoc(doc(db, 'clientes_staff', miUid), { nombre: miNombre, rol: miRol, online: true, ultimaVez: serverTimestamp() }, { merge: true }).catch(()=>{});
        const goOffline = () => setDoc(doc(db, 'clientes_staff', miUid), { online: false, ultimaVez: serverTimestamp() }, { merge: true }).catch(()=>{});
        window.addEventListener('beforeunload', goOffline);
        return () => { unsub(); window.removeEventListener('beforeunload', goOffline); goOffline(); };
    }, [miUid, miNombre, miRol]);

    const totalNoLeidos = canales.reduce((s, c) => s + (c.noLeidos?.[miUid] ?? 0), 0);
    if (!miUid) return null;

    return (
        <>
            <div className={cn('fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 transition-opacity duration-500', abierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} onClick={onCerrar} />
            <div className={cn('fixed top-0 right-0 h-full w-full sm:w-[380px] z-50 flex flex-col bg-[#0a0a0a] border-l border-white/8 transition-transform duration-500', abierto ? 'translate-x-0' : 'translate-x-full')}>
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/8 shrink-0 bg-black/30 backdrop-blur-xl">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/18 flex items-center justify-center"><MessageSquare className="w-4 h-4 text-yellow-500" /></div>
                        <div><h2 className="text-[13px] font-semibold text-white">Mensajes</h2><p className="text-[10px] text-white/30">{totalNoLeidos > 0 ? `${totalNoLeidos} sin leer` : 'ATEMPO Staff'}</p></div>
                    </div>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-white/8 rounded-xl text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-hidden">
                    {cargandoInit ? <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div> : canalActivo ? (
                        <VistaMensajes canal={canalActivo} miUid={miUid} miNombre={miNombre} miRol={miRol} usuarios={usuarios} onVolver={() => setCanalActivo(null)} />
                    ) : (
                        <div className="overflow-y-auto h-full">
                            {canales.map(c => {
                                const noL = c.noLeidos?.[miUid] ?? 0;
                                const otro = c.tipo === 'dm' ? usuarios.find(u => u.uid === c.participantes.find(p => p !== miUid)) : null;
                                return (
                                    <button key={c.id} onClick={() => setCanalActivo(c)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/4 text-left">
                                        {c.tipo === 'general' ? <div className="w-9 h-9 rounded-full bg-yellow-500/12 flex items-center justify-center"><Hash className="w-4 h-4 text-yellow-500" /></div> : <Avatar nombre={otro?.nombre ?? 'U'} size="sm" online={otro?.online} />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-white">{c.tipo === 'general' ? 'Staff Atempo' : otro?.nombre ?? 'Usuario'}</p>
                                            <p className="text-[11px] text-white/30 truncate">{c.ultimoMensaje || 'Sin mensajes'}</p>
                                        </div>
                                        {noL > 0 && <span className="min-w-[18px] h-[18px] rounded-full bg-yellow-500 text-black text-[9px] font-bold flex items-center justify-center">{noL}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                {!canalActivo && (
                    <div className="shrink-0 px-4 py-3 border-t border-white/8 flex items-center gap-2.5">
                        <Avatar nombre={miNombre} size="sm" online={true} />
                        <div className="flex-1"><p className="text-[12px] font-medium text-white/65">{miNombre}</p><p className="text-[10px] text-emerald-400">En linea</p></div>
                    </div>
                )}
            </div>
        </>
    );
}

export function useChatNoLeidos(uid: string | undefined): number {
    const [total, setTotal] = useState(0);
    const { usuario } = useAuth() as any;
    const miUid = uid || usuario?.uid;
    
    useEffect(() => {
        if (!miUid) return;
        const unsub = onSnapshot(query(collection(db, 'chat_canales'), where('participantes', 'array-contains', miUid)), snap => setTotal(snap.docs.reduce((s, d) => s + (d.data().noLeidos?.[miUid] ?? 0), 0)), () => {});
        return unsub;
    }, [miUid]);
    return total;
}
