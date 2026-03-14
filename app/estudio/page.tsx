'use client';

/**
 * app/estudio/page.tsx
 * Vista en vivo del estudio ATEMPO — Pixel Office
 * Conectada a TODOS los datos reales de Firestore
 */

import { useMemo } from 'react';
import PixelOffice from '@/components/pixel/PixelOffice';
import { useAlumnos }       from '@/lib/useAlumnos';
import { useVentas }        from '@/lib/useVentas';
import { useGastos }        from '@/lib/useGastos';
import { useCuentasCobrar } from '@/lib/useCuentasCobrar';
import { useAsistencia }    from '@/lib/useAsistencia';
import { useProductos }     from '@/lib/useProductos';
import { Loader2 }          from 'lucide-react';

export default function EstudioPage() {
  const { alumnos,   cargando: cA  } = useAlumnos();
  const { ventas,    cargando: cV  } = useVentas();
  const { gastos,    cargando: cG  } = useGastos();
  const { cuentas,   cargando: cC  } = useCuentasCobrar();
  const { registros, cargando: cAs } = useAsistencia();
  const { productos, cargando: cP  } = useProductos();

  const cargando = cA || cV || cG || cC || cAs || cP;

  const hoy       = new Date().toISOString().split('T')[0];
  const mesActual = hoy.substring(0, 7);

  // ── Ventas hoy ──────────────────────────────────────────────────────────────
  const ventasHoy = useMemo(() => ventas
    .filter(v => {
      const f = v.fecha || '';
      if (f.includes('/')) {
        const [d, m, y] = f.split('/');
        return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` === hoy;
      }
      return f.startsWith(hoy);
    })
    .reduce((acc, v) => acc + (v.total || 0), 0),
  [ventas, hoy]);

  // ── Ventas recientes (últimas 10) para contexto ──────────────────────────
  const ventasRecientes = useMemo(() => ventas.slice(0, 10).map(v => ({
    fecha:       v.fecha,
    total:       v.total,
    totalUSD:    v.totalUSD,
    metodoPago:  v.metodoPago?.[0]?.tipo || '',
    item:        v.items?.[0]?.nombre || '',
  })), [ventas]);

  // ── Gastos del mes ──────────────────────────────────────────────────────────
  const gastosMes = useMemo(() => gastos
    .filter(g => {
      const f = g.fecha || '';
      if (f.includes('/')) {
        const [, m, y] = f.split('/');
        return `${y}-${m.padStart(2,'0')}` === mesActual;
      }
      return f.startsWith(mesActual);
    })
    .reduce((acc, g) => acc + (g.montoBs || 0), 0),
  [gastos, mesActual]);

  // ── Gastos recientes (últimos 5) ────────────────────────────────────────────
  const gastosRecientes = useMemo(() => gastos.slice(0, 5).map(g => ({
    descripcion: g.descripcion,
    categoria:   g.categoria,
    montoBs:     g.montoBs,
    fecha:       g.fecha,
  })), [gastos]);

  // ── Alumnos ──────────────────────────────────────────────────────────────────
  const alumnosActivos  = alumnos.filter(a => a.estado === 'activo').length;
  const alumnosInactivos = alumnos.filter(a => a.estado !== 'activo').length;
  const conPocasClases  = alumnos.filter(a =>
    a.paqueteActivo && a.paqueteActivo.clasesRestantes <= 2 && a.estado === 'activo'
  ).length;

  // Lista de alumnos con pocas clases
  const alumnosPocasClases = useMemo(() => alumnos
    .filter(a => a.paqueteActivo && a.paqueteActivo.clasesRestantes <= 2 && a.estado === 'activo')
    .map(a => ({ nombre: a.nombre || '', clasesRestantes: a.paqueteActivo?.clasesRestantes })),
  [alumnos]);

  // ── Cuentas ──────────────────────────────────────────────────────────────────
  const cuentasVencidas  = cuentas.filter(c => c.estado === 'vencida').length;
  const cuentasPendientes = cuentas.filter(c => c.estado === 'pendiente').length;
  const totalPorCobrar   = cuentas
    .filter(c => c.estado !== 'pagado')
    .reduce((a, c) => a + ((c.montoBs || 0) - (c.montoPagado || 0)), 0);

  // ── Asistencia ───────────────────────────────────────────────────────────────
  const presentesHoy = registros.filter(r => r.presente).length;

  // ── Inventario / Productos ────────────────────────────────────────────────
  const productosActivos = productos.filter(p => p.activo);
  const stockBajo        = productosActivos.filter(p => p.stock <= p.stockMinimo);

  // Resumen de productos para el contexto de los agentes
  const resumenProductos = useMemo(() => productosActivos.map(p => ({
    nombre:      p.nombre,
    categoria:   p.categoria || '',
    precioBs:    p.precioBs,
    stock:       p.stock,
    stockMinimo: p.stockMinimo,
    unidad:      p.unidad || 'und',
  })), [productosActivos]);

  if (cargando) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      <span className="ml-3 text-muted-foreground">Cargando vista del estudio...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Estudio en Vivo</h1>
        <p className="text-muted-foreground text-sm">
          Vista pixel art del estudio ATEMPO — agentes activos en tiempo real
        </p>
      </div>

      <div className="card-sistema p-5">
        <PixelOffice
          // Datos básicos (KPIs)
          ventasHoy={ventasHoy}
          alumnosActivos={alumnosActivos}
          cuentasVencidas={cuentasVencidas}
          presentesHoy={presentesHoy}
          conPocasClases={conPocasClases}
          gastosMes={gastosMes}
          // Datos completos para los agentes IA
          datosCompletos={{
            ventas: {
              hoy:            ventasHoy,
              totalMes:       ventas.reduce((a, v) => a + (v.total || 0), 0),
              recientes:      ventasRecientes,
              cantidadHoy:    ventas.filter(v => {
                const f = v.fecha || '';
                if (f.includes('/')) { const [d,m,y] = f.split('/'); return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` === hoy; }
                return f.startsWith(hoy);
              }).length,
            },
            gastos: {
              mes:       gastosMes,
              recientes: gastosRecientes,
            },
            alumnos: {
              activos:          alumnosActivos,
              inactivos:        alumnosInactivos,
              total:            alumnos.length,
              conPocasClases,
              listaPocasClases: alumnosPocasClases,
            },
            cuentas: {
              vencidas:     cuentasVencidas,
              pendientes:   cuentasPendientes,
              totalPorCobrar,
            },
            asistencia: {
              presentesHoy,
              totalRegistros: registros.length,
            },
            inventario: {
              totalProductos:  productosActivos.length,
              stockBajoCount:  stockBajo.length,
              stockBajoNombres: stockBajo.map(p => p.nombre),
              productos:       resumenProductos,
            },
          }}
        />
      </div>

      {/* Leyenda */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Salon A', icon: '💃', desc: 'Clases y alquiler', color: '#3b82f6' },
          { label: 'Salon B', icon: '🎭', desc: 'Clases y alquiler', color: '#8b5cf6' },
          { label: 'Salon C', icon: '🎶', desc: 'Clases y alquiler', color: '#06b6d4' },
          { label: 'Cafetín', icon: '☕', desc: 'Area de descanso',  color: '#f59e0b' },
          { label: 'Oficinas', icon: '🖥️', desc: 'Admin y contabilidad', color: '#22c55e' },
        ].map(esp => (
          <div key={esp.label} className="card-sistema p-3 text-center">
            <span className="text-2xl">{esp.icon}</span>
            <p className="text-xs font-semibold mt-1" style={{ color: esp.color }}>{esp.label}</p>
            <p className="text-xs text-muted-foreground">{esp.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
