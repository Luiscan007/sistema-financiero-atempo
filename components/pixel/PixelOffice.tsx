'use client';

/**
 * components/pixel/PixelOffice.tsx
 * Oficina pixel art del estudio ATEMPO
 * Vista top-down con personajes animados conectados a datos reales
 *
 * Instalar dependencia: npm install (sin dependencias externas - solo React + Canvas)
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════ */
interface AgentData {
  id:        string;
  nombre:    string;
  rol:       string;
  estado:    'idle' | 'walk' | 'work' | 'alert' | 'coffee';
  alerta?:   string;
  valor?:    string | number;
  color:     string;   // color del sprite
  accentColor: string; // color de acento
  roomTarget: string;  // sala donde trabaja
  icono:     string;   // emoji para UI
}

interface Room {
  id:     string;
  label:  string;
  x:      number;
  y:      number;
  w:      number;
  h:      number;
  color:  string;
  accent: string;
  icon:   string;
}

interface Personaje {
  id:       string;
  x:        number;
  y:        number;
  tx:       number;  // target x
  ty:       number;  // target y
  frame:    number;  // frame animacion
  dir:      'left' | 'right' | 'up' | 'down';
  estado:   AgentData['estado'];
  color:    string;
  accentColor: string;
  nombre:   string;
  rol:      string;
  alerta?:  string;
  valor?:   string | number;
  icono:    string;
  timer:    number;  // ticks hasta cambiar de destino
  workRoom: string;
}

/* ═══════════════════════════════════════════
   PROPS
═══════════════════════════════════════════ */
interface PixelOfficeProps {
  // Datos reales del sistema (opcionales - fallback a demo)
  ventasHoy?:        number;
  alumnosActivos?:   number;
  cuentasVencidas?:  number;
  presentesHoy?:     number;
  conPocasClases?:   number;
  gastosMes?:        number;
}

/* ═══════════════════════════════════════════
   LAYOUT DEL EDIFICIO
═══════════════════════════════════════════ */
const ROOMS: Room[] = [
  // Salones de baile
  {
    id: 'salon_a', label: 'Salon A', icon: '💃',
    x: 20,  y: 20,  w: 160, h: 130,
    color: '#1a2744', accent: '#3b82f6',
  },
  {
    id: 'salon_b', label: 'Salon B', icon: '🎭',
    x: 200, y: 20,  w: 160, h: 130,
    color: '#1f1a44', accent: '#8b5cf6',
  },
  {
    id: 'salon_c', label: 'Salon C', icon: '🎶',
    x: 380, y: 20,  w: 160, h: 130,
    color: '#1a3344', accent: '#06b6d4',
  },
  // Cafetín
  {
    id: 'cafetín', label: 'Cafetín', icon: '☕',
    x: 560, y: 20,  w: 200, h: 130,
    color: '#2a1a0a', accent: '#f59e0b',
  },
  // Oficinas
  {
    id: 'oficina_admin', label: 'Oficina Admin', icon: '🖥️',
    x: 20,  y: 170, w: 230, h: 140,
    color: '#0f1f1a', accent: '#22c55e',
  },
  {
    id: 'oficina_conta', label: 'Contabilidad', icon: '📊',
    x: 270, y: 170, w: 230, h: 140,
    color: '#1a0f2a', accent: '#ec4899',
  },
  // Pasillo central
  {
    id: 'pasillo', label: '', icon: '',
    x: 520, y: 170, w: 240, h: 140,
    color: '#0d1117', accent: '#334155',
  },
];

/* ═══════════════════════════════════════════
   FUNCIONES DE DIBUJO PIXEL ART
═══════════════════════════════════════════ */

function dibujarHabitacion(ctx: CanvasRenderingContext2D, room: Room) {
  // Fondo
  ctx.fillStyle = room.color;
  ctx.fillRect(room.x, room.y, room.w, room.h);

  // Borde
  ctx.strokeStyle = room.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(room.x + 1, room.y + 1, room.w - 2, room.h - 2);

  // Borde interior sutil
  ctx.strokeStyle = room.accent + '30';
  ctx.lineWidth = 1;
  ctx.strokeRect(room.x + 4, room.y + 4, room.w - 8, room.h - 8);

  // Grid de piso (efecto tile)
  ctx.strokeStyle = room.accent + '18';
  ctx.lineWidth = 1;
  for (let gx = room.x + 20; gx < room.x + room.w; gx += 20) {
    ctx.beginPath();
    ctx.moveTo(gx, room.y + 14);
    ctx.lineTo(gx, room.y + room.h - 4);
    ctx.stroke();
  }
  for (let gy = room.y + 20; gy < room.y + room.h; gy += 20) {
    ctx.beginPath();
    ctx.moveTo(room.x + 4, gy);
    ctx.lineTo(room.x + room.w - 4, gy);
    ctx.stroke();
  }

  // Label
  if (room.label) {
    ctx.fillStyle = room.accent;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(room.icon + ' ' + room.label, room.x + 8, room.y + 13);
  }
}

function dibujarMobiliario(ctx: CanvasRenderingContext2D, rooms: Room[]) {
  rooms.forEach(room => {
    if (room.id === 'salon_a' || room.id === 'salon_b' || room.id === 'salon_c') {
      // Espejos en la pared
      ctx.fillStyle = room.accent + '40';
      ctx.fillRect(room.x + 10, room.y + 18, room.w - 20, 8);
      ctx.strokeStyle = room.accent + '80';
      ctx.lineWidth = 1;
      ctx.strokeRect(room.x + 10, room.y + 18, room.w - 20, 8);

      // Barras de ballet
      ctx.strokeStyle = room.accent + '60';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(room.x + 15, room.y + 38);
      ctx.lineTo(room.x + room.w - 15, room.y + 38);
      ctx.stroke();

      // Altavoces pixel
      const sx = room.x + room.w - 22;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sx, room.y + 50, 14, 18);
      ctx.fillStyle = room.accent;
      ctx.fillRect(sx + 3, room.y + 55, 8, 8);

      // Notas musicales decorativas
      ctx.fillStyle = room.accent + '50';
      ctx.font = '10px serif';
      ctx.fillText('♪', room.x + 20, room.y + 70);
      ctx.fillText('♫', room.x + 40, room.y + 90);
    }

    if (room.id === 'cafetín') {
      // Mostrador
      ctx.fillStyle = '#3d2b1f';
      ctx.fillRect(room.x + 10, room.y + 70, room.w - 20, 16);
      ctx.strokeStyle = '#f59e0b50';
      ctx.lineWidth = 1;
      ctx.strokeRect(room.x + 10, room.y + 70, room.w - 20, 16);

      // Cafetera pixel art
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(room.x + 20, room.y + 40, 20, 28);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(room.x + 22, room.y + 38, 16, 4);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(room.x + 25, room.y + 44, 10, 14);

      // Mesas redondas
      [[room.x + 80, room.y + 55], [room.x + 130, room.y + 90]].forEach(([mx, my]) => {
        ctx.fillStyle = '#3d2b1f';
        ctx.beginPath();
        ctx.ellipse(mx as number, my as number, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b40';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Tazas
        ctx.fillStyle = '#fff8';
        ctx.fillRect((mx as number) - 4, (my as number) - 5, 6, 5);
      });

      // Letrero
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('ATEMPO CAFE', room.x + 60, room.y + 15);
    }

    if (room.id === 'oficina_admin') {
      // Escritorios
      [[room.x + 30, room.y + 60], [room.x + 140, room.y + 60]].forEach(([dx, dy]) => {
        ctx.fillStyle = '#1e3a2a';
        ctx.fillRect(dx as number, dy as number, 60, 30);
        ctx.strokeStyle = '#22c55e40';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx as number, dy as number, 60, 30);
        // Monitor
        ctx.fillStyle = '#0d2218';
        ctx.fillRect((dx as number) + 15, (dy as number) - 18, 30, 18);
        ctx.fillStyle = '#22c55e30';
        ctx.fillRect((dx as number) + 17, (dy as number) - 16, 26, 14);
        // Pie monitor
        ctx.fillStyle = '#1e3a2a';
        ctx.fillRect((dx as number) + 25, (dy as number), 10, 4);
      });

      // Planta
      ctx.fillStyle = '#15432a';
      ctx.fillRect(room.x + room.w - 25, room.y + 90, 12, 30);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(room.x + room.w - 19, room.y + 85, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(room.x + room.w - 19, room.y + 80, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (room.id === 'oficina_conta') {
      // Escritorios contabilidad
      [[room.x + 20, room.y + 50], [room.x + 130, room.y + 80]].forEach(([dx, dy]) => {
        ctx.fillStyle = '#2a1a3d';
        ctx.fillRect(dx as number, dy as number, 70, 32);
        ctx.strokeStyle = '#ec4899' + '40';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx as number, dy as number, 70, 32);
        // Monitor
        ctx.fillStyle = '#180d2a';
        ctx.fillRect((dx as number) + 18, (dy as number) - 20, 34, 20);
        ctx.fillStyle = '#ec489930';
        ctx.fillRect((dx as number) + 20, (dy as number) - 18, 30, 16);
        // Pie
        ctx.fillStyle = '#2a1a3d';
        ctx.fillRect((dx as number) + 28, (dy as number), 14, 4);
      });

      // Archiveros
      ctx.fillStyle = '#1a0f2a';
      ctx.fillRect(room.x + room.w - 30, room.y + 18, 22, 80);
      ctx.strokeStyle = '#ec489950';
      ctx.lineWidth = 1;
      for (let fy = 0; fy < 4; fy++) {
        ctx.strokeRect(room.x + room.w - 29, room.y + 20 + fy * 19, 20, 17);
        ctx.fillStyle = '#ec489980';
        ctx.fillRect(room.x + room.w - 22, room.y + 27 + fy * 19, 6, 4);
      }
    }

    if (room.id === 'pasillo') {
      // Panel de estado central
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(room.x + 10, room.y + 20, room.w - 20, 100);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(room.x + 10, room.y + 20, room.w - 20, 100);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(room.x + 14, room.y + 24, room.w - 28, 8);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('ATEMPO SYSTEM STATUS', room.x + 20, room.y + 31);

      // Sillas de espera
      [[room.x + 20, room.y + 128], [room.x + 50, room.y + 128], [room.x + 80, room.y + 128]].forEach(([sx, sy]) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(sx as number, sy as number, 22, 10);
        ctx.fillStyle = '#334155';
        ctx.fillRect(sx as number, (sy as number) - 12, 4, 12);
      });
    }
  });
}

function dibujarPersonaje(
  ctx: CanvasRenderingContext2D,
  p: Personaje,
  tick: number,
  seleccionado: boolean
) {
  const { x, y, frame, estado, color, accentColor } = p;
  const bob   = Math.sin(tick * 0.15 + frame) * (estado === 'walk' ? 2 : 0.5);
  const walkX = estado === 'walk' ? Math.sin(tick * 0.3 + frame) * 2 : 0;

  const px = Math.round(x);
  const py = Math.round(y + bob);

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px, py + 14, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Seleccionado — halo
  if (seleccionado) {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.ellipse(px, py + 2, 14, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cuerpo (torso)
  ctx.fillStyle = color;
  ctx.fillRect(px - 5, py - 4, 10, 12);

  // Cabeza
  ctx.fillStyle = '#f5d0a9';
  ctx.fillRect(px - 4, py - 14, 8, 8);

  // Cabello
  ctx.fillStyle = accentColor;
  ctx.fillRect(px - 4, py - 14, 8, 3);

  // Ojos
  ctx.fillStyle = '#1e293b';
  const eyeFrame = Math.floor(tick / 60) % 8 === 0 ? 0 : 1;
  if (eyeFrame > 0) {
    ctx.fillRect(px - 3, py - 10, 2, 2);
    ctx.fillRect(px + 1, py - 10, 2, 2);
  } else {
    ctx.fillRect(px - 3, py - 10, 2, 1); // cerrados
    ctx.fillRect(px + 1, py - 10, 2, 1);
  }

  // Piernas con animacion walk
  if (estado === 'walk') {
    const legSwing = Math.sin(tick * 0.3 + frame) * 3;
    ctx.fillStyle = '#334155';
    ctx.fillRect(px - 4 + legSwing, py + 8, 4, 6);
    ctx.fillRect(px + 1 - legSwing, py + 8, 4, 6);
    // Zapatos
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px - 5 + legSwing, py + 13, 5, 2);
    ctx.fillRect(px - legSwing, py + 13, 5, 2);
  } else {
    ctx.fillStyle = '#334155';
    ctx.fillRect(px - 4, py + 8, 4, 6);
    ctx.fillRect(px + 1, py + 8, 4, 6);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px - 5, py + 13, 5, 2);
    ctx.fillRect(px, py + 13, 5, 2);
  }

  // Brazos con animacion work
  if (estado === 'work') {
    const armBob = Math.sin(tick * 0.2 + frame) * 2;
    ctx.fillStyle = color;
    ctx.fillRect(px - 9, py - 2 + armBob, 4, 8);
    ctx.fillRect(px + 5, py - 2 - armBob, 4, 8);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(px - 9 + walkX, py - 2, 4, 8);
    ctx.fillRect(px + 5 - walkX, py - 2, 4, 8);
  }

  // Estado alert — exclamacion
  if (estado === 'alert') {
    const pulse = Math.sin(tick * 0.2) > 0;
    if (pulse) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('!', px - 3, py - 18);
    }
  }

  // Estado coffee
  if (estado === 'coffee') {
    ctx.fillStyle = '#f59e0b';
    ctx.font = '10px serif';
    ctx.fillText('☕', px - 5, py - 16);
  }

  // Badge nombre
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  const labelW = p.nombre.length * 5 + 8;
  ctx.fillRect(px - labelW / 2, py + 16, labelW, 11);
  ctx.strokeStyle = accentColor + '80';
  ctx.lineWidth = 1;
  ctx.strokeRect(px - labelW / 2, py + 16, labelW, 11);
  ctx.fillStyle = accentColor;
  ctx.font = '7px monospace';
  ctx.fillText(p.nombre, px - labelW / 2 + 4, py + 24);
}

function dibujarStatusPanel(
  ctx: CanvasRenderingContext2D,
  room: Room,
  agentes: Personaje[],
  tick: number
) {
  const r = room;
  const items = agentes.map(a => ({
    label: a.rol,
    valor: a.valor,
    color: a.accentColor,
    estado: a.estado,
  }));

  items.forEach((item, i) => {
    const iy = r.y + 38 + i * 17;
    if (iy > r.y + r.h - 10) return;
    const pulse = Math.sin(tick * 0.1 + i) > 0;

    // Dot de estado
    ctx.fillStyle = item.estado === 'alert' ? '#ef4444'
      : item.estado === 'work'  ? item.color
      : '#334155';
    if (item.estado === 'alert' && pulse) ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(r.x + 20, iy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Texto
    ctx.fillStyle = '#94a3b8';
    ctx.font = '7px monospace';
    ctx.fillText(item.label, r.x + 26, iy + 3);

    // Valor
    if (item.valor !== undefined) {
      ctx.fillStyle = item.color;
      ctx.font = 'bold 7px monospace';
      const vStr = String(item.valor);
      ctx.fillText(vStr, r.x + r.w - 14 - vStr.length * 5, iy + 3);
    }
  });
}

/* ═══════════════════════════════════════════
   PATHFINDING SIMPLE (destinos dentro de sala)
═══════════════════════════════════════════ */
function destinoEnSala(room: Room, margen = 20): { tx: number; ty: number } {
  return {
    tx: room.x + margen + Math.random() * (room.w - margen * 2),
    ty: room.y + margen + Math.random() * (room.h - margen * 2),
  };
}

function getRoomById(id: string): Room {
  return ROOMS.find(r => r.id === id) || ROOMS[0];
}

/* ═══════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════ */
export default function PixelOffice({
  ventasHoy       = 0,
  alumnosActivos  = 0,
  cuentasVencidas = 0,
  presentesHoy    = 0,
  conPocasClases  = 0,
  gastosMes       = 0,
}: PixelOfficeProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const tickRef        = useRef(0);
  const personajesRef  = useRef<Personaje[]>([]);
  const rafRef         = useRef<number>(0);

  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [tooltipInfo,  setTooltipInfo]  = useState<Personaje | null>(null);

  /* ── Definir agentes según datos reales ── */
  const agentes: AgentData[] = [
    {
      id: 'fin', nombre: 'Luna', rol: 'Finanzas',
      estado: ventasHoy > 0 ? 'work' : 'idle',
      color: '#1d4ed8', accentColor: '#60a5fa',
      roomTarget: 'oficina_conta',
      valor: ventasHoy > 0 ? `Bs ${(ventasHoy/1000).toFixed(0)}k` : '-',
      alerta: ventasHoy === 0 ? 'Sin ventas hoy' : undefined,
      icono: '💰',
    },
    {
      id: 'alm', nombre: 'Marco', rol: 'Alumnos',
      estado: conPocasClases > 0 ? 'alert' : alumnosActivos > 0 ? 'work' : 'idle',
      color: '#7c3aed', accentColor: '#a78bfa',
      roomTarget: 'oficina_admin',
      valor: alumnosActivos,
      alerta: conPocasClases > 0 ? `${conPocasClases} con pocas clases` : undefined,
      icono: '🎓',
    },
    {
      id: 'cob', nombre: 'Sofia', rol: 'Cobros',
      estado: cuentasVencidas > 0 ? 'alert' : 'idle',
      color: '#be185d', accentColor: '#f472b6',
      roomTarget: 'oficina_conta',
      valor: cuentasVencidas > 0 ? `${cuentasVencidas} vencidas` : 'OK',
      alerta: cuentasVencidas > 0 ? `${cuentasVencidas} cuentas vencidas` : undefined,
      icono: '📋',
    },
    {
      id: 'asi', nombre: 'Diego', rol: 'Asistencia',
      estado: presentesHoy > 0 ? 'work' : 'idle',
      color: '#065f46', accentColor: '#34d399',
      roomTarget: 'salon_a',
      valor: presentesHoy,
      icono: '✅',
    },
    {
      id: 'gas', nombre: 'Ana', rol: 'Gastos',
      estado: gastosMes > 0 ? 'work' : 'coffee',
      color: '#92400e', accentColor: '#fbbf24',
      roomTarget: 'cafetín',
      valor: gastosMes > 0 ? `Bs ${(gastosMes/1000).toFixed(0)}k` : '-',
      icono: '📊',
    },
  ];

  /* ── Inicializar personajes ── */
  useEffect(() => {
    personajesRef.current = agentes.map((a, i) => {
      const room  = getRoomById(a.roomTarget);
      const dest  = destinoEnSala(room);
      return {
        id:          a.id,
        x:           room.x + 30 + i * 15,
        y:           room.y + 40,
        tx:          dest.tx,
        ty:          dest.ty,
        frame:       i * 1.5,
        dir:         'right',
        estado:      a.estado,
        color:       a.color,
        accentColor: a.accentColor,
        nombre:      a.nombre,
        rol:         a.rol,
        alerta:      a.alerta,
        valor:       a.valor,
        icono:       a.icono,
        timer:       80 + Math.random() * 120,
      } as Personaje;
    });
  }, [ventasHoy, alumnosActivos, cuentasVencidas, presentesHoy, conPocasClases, gastosMes]);

  /* ── Game loop ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const loop = () => {
      tickRef.current++;
      const tick = tickRef.current;

      // Clear
      ctx.fillStyle = '#080d14';
      ctx.fillRect(0, 0, W, H);

      // Dibujar habitaciones
      ROOMS.forEach(r => dibujarHabitacion(ctx, r));

      // Dibujar mobiliario
      dibujarMobiliario(ctx, ROOMS);

      // Panel de status (pasillo)
      const pasilloRoom = ROOMS.find(r => r.id === 'pasillo');
      if (pasilloRoom) {
        dibujarStatusPanel(ctx, pasilloRoom, personajesRef.current, tick);
      }

      // Actualizar y dibujar personajes
      personajesRef.current = personajesRef.current.map(p => {
        let { x, y, tx, ty, timer, estado } = p;

        // Mover hacia destino
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = estado === 'alert' ? 1.8 : 1.2;

        if (dist > 3) {
          x += (dx / dist) * speed;
          y += (dy / dist) * speed;
          estado = p.alerta ? 'alert' : 'walk';
        } else {
          estado = p.alerta ? 'alert'
            : p.rol === 'Gastos' && Math.random() < 0.002 ? 'coffee'
            : 'work';
        }

        // Timer para cambiar destino
        timer--;
        if (timer <= 0) {
          const room = getRoomById(p.id === 'asi' ? 'salon_a'
            : p.id === 'gas' ? (Math.random() < 0.3 ? 'cafetín' : 'oficina_admin')
            : p.id === 'fin' || p.id === 'cob' ? 'oficina_conta'
            : 'oficina_admin');

          // Ocasionalmente visitar cafetín
          const targetRoom = Math.random() < 0.1 ? getRoomById('cafetín') : room;
          const dest = destinoEnSala(targetRoom);
          return { ...p, x, y, tx: dest.tx, ty: dest.ty, estado, timer: 100 + Math.random() * 150 };
        }

        return { ...p, x, y, estado, timer };
      });

      // Dibujar personajes (no seleccionado primero)
      personajesRef.current
        .filter(p => p.id !== seleccionado)
        .forEach(p => dibujarPersonaje(ctx, p, tick, false));

      // Seleccionado encima
      const sel = personajesRef.current.find(p => p.id === seleccionado);
      if (sel) dibujarPersonaje(ctx, sel, tick, true);

      // Scan lines efecto retro
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let sl = 0; sl < H; sl += 4) {
        ctx.fillRect(0, sl, W, 2);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [seleccionado]);

  /* ── Click en canvas ── */
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;

    // Detectar clic en personaje
    const clicked = personajesRef.current.find(p =>
      Math.abs(p.x - mx) < 14 && Math.abs(p.y - my) < 20
    );

    if (clicked) {
      setSeleccionado(prev => prev === clicked.id ? null : clicked.id);
      setTooltipInfo(clicked);
    } else {
      setSeleccionado(null);
      setTooltipInfo(null);
    }
  }, []);

  const agenteActivo = agentes.find(a => a.id === seleccionado);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono text-foreground">
            🏢 ATEMPO — Vista en Vivo
          </h2>
          <p className="text-xs text-muted-foreground">
            Haz click en un agente para ver su estado
          </p>
        </div>
        <div className="flex gap-2">
          {agentes.filter(a => a.alerta).map(a => (
            <span key={a.id}
              className="text-xs px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse">
              {a.icono} {a.nombre}: {a.alerta}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap xl:flex-nowrap">
        {/* Canvas principal */}
        <div className="relative flex-1 min-w-0">
          <canvas
            ref={canvasRef}
            width={760}
            height={320}
            onClick={handleClick}
            className="w-full rounded-xl border border-border cursor-pointer"
            style={{ imageRendering: 'pixelated', background: '#080d14' }}
          />
          {/* Overlay esquina */}
          <div className="absolute bottom-3 left-3 text-xs font-mono text-slate-600 select-none">
            ATEMPO v1.0 • {new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Panel lateral de agentes */}
        <div className="flex flex-col gap-2 w-full xl:w-52">
          {agentes.map(a => (
            <button
              key={a.id}
              onClick={() => setSeleccionado(prev => prev === a.id ? null : a.id)}
              className={`text-left p-3 rounded-xl border transition-all duration-200 ${
                seleccionado === a.id
                  ? 'border-opacity-60 bg-opacity-20'
                  : 'border-border bg-card hover:border-opacity-40'
              }`}
              style={seleccionado === a.id ? {
                borderColor: a.accentColor,
                background: a.accentColor + '15',
              } : {}}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{a.icono}</span>
                  <span className="text-xs font-semibold">{a.nombre}</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${
                  a.estado === 'alert' ? 'bg-red-400 animate-pulse' :
                  a.estado === 'work'  ? 'bg-emerald-400' :
                  a.estado === 'coffee' ? 'bg-amber-400' :
                  'bg-slate-500'
                }`} />
              </div>
              <p className="text-xs text-muted-foreground">{a.rol}</p>
              {a.valor !== undefined && (
                <p className="text-xs font-mono mt-1" style={{ color: a.accentColor }}>
                  {a.valor}
                </p>
              )}
              {a.alerta && (
                <p className="text-xs text-red-400 mt-1 truncate">⚠ {a.alerta}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Panel de detalle del agente seleccionado */}
      {agenteActivo && (
        <div className="p-4 rounded-xl border transition-all duration-200"
          style={{
            borderColor: agenteActivo.accentColor + '50',
            background: agenteActivo.accentColor + '08',
          }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{agenteActivo.icono}</span>
            <div>
              <p className="font-bold">{agenteActivo.nombre} — {agenteActivo.rol}</p>
              <p className="text-xs text-muted-foreground capitalize">
                Estado: {agenteActivo.estado === 'work' ? 'Trabajando' :
                         agenteActivo.estado === 'alert' ? 'Alerta activa' :
                         agenteActivo.estado === 'coffee' ? 'En el cafetín' :
                         'En espera'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {agenteActivo.id === 'fin' && (
              <>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Ventas hoy</p>
                  <p className="font-mono font-bold mt-0.5">Bs {ventasHoy.toLocaleString('es-VE')}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Estado</p>
                  <p className="font-bold mt-0.5 text-emerald-400">{ventasHoy > 0 ? 'Activo' : 'Sin movimiento'}</p>
                </div>
              </>
            )}
            {agenteActivo.id === 'alm' && (
              <>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Alumnos activos</p>
                  <p className="font-mono font-bold mt-0.5">{alumnosActivos}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Pocas clases</p>
                  <p className={`font-bold mt-0.5 ${conPocasClases > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {conPocasClases > 0 ? `${conPocasClases} alumnos` : 'OK'}
                  </p>
                </div>
              </>
            )}
            {agenteActivo.id === 'cob' && (
              <>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Cuentas vencidas</p>
                  <p className={`font-mono font-bold mt-0.5 ${cuentasVencidas > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {cuentasVencidas > 0 ? cuentasVencidas : 'Ninguna'}
                  </p>
                </div>
              </>
            )}
            {agenteActivo.id === 'asi' && (
              <>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Presentes hoy</p>
                  <p className="font-mono font-bold mt-0.5 text-emerald-400">{presentesHoy}</p>
                </div>
              </>
            )}
            {agenteActivo.id === 'gas' && (
              <>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Gastos del mes</p>
                  <p className="font-mono font-bold mt-0.5 text-red-400">
                    Bs {gastosMes.toLocaleString('es-VE')}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
