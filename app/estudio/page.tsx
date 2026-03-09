'use client';

/**
 * app/estudio/page.tsx
 * Vista en vivo del estudio ATEMPO — Pixel Office
 * Conectada a datos reales de Firestore
 */

import { useMemo } from 'react';
import PixelOffice from '@/components/pixel/PixelOffice';
import { useAlumnos }        from '@/lib/useAlumnos';
import { useVentas }         from '@/lib/useVentas';
import { useGastos }         from '@/lib/useGastos';
import { useCuentasCobrar }  from '@/lib/useCuentasCobrar';
import { useAsistencia }     from '@/lib/useAsistencia';
import { Loader2 }           from 'lucide-react';

export default function EstudioPage() {
  const { alumnos,  cargando: cA } = useAlumnos();
  const { ventas,   cargando: cV } = useVentas();
  const { gastos,   cargando: cG } = useGastos();
  const { cuentas,  cargando: cC } = useCuentasCobrar();
  const { registros, cargando: cAs } = useAsistencia();

  const cargando = cA || cV || cG || cC || cAs;

  const hoy = new Date().toISOString().split('T')[0];

  const ventasHoy = useMemo(() => {
    return ventas
      .filter(v => {
        const f = v.fecha || '';
        // Fecha viene como DD/MM/YYYY o YYYY-MM-DD
        if (f.includes('/')) {
          const [d, m, y] = f.split('/');
          return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` === hoy;
        }
        return f.startsWith(hoy);
      })
      .reduce((acc, v) => acc + (v.total || 0), 0);
  }, [ventas, hoy]);

  const gastosMes = useMemo(() => {
    const mesActual = hoy.substring(0, 7);
    return gastos
      .filter(g => (g.fecha || '').startsWith(mesActual) ||
        // También formato DD/MM/YYYY
        (() => {
          const f = g.fecha || '';
          if (!f.includes('/')) return false;
          const [, m, y] = f.split('/');
          return `${y}-${m.padStart(2,'0')}` === mesActual;
        })()
      )
      .reduce((acc, g) => acc + (g.montoBs || 0), 0);
  }, [gastos, hoy]);

  const alumnosActivos  = alumnos.filter(a => a.estado === 'activo').length;
  const conPocasClases  = alumnos.filter(a =>
    a.paqueteActivo && a.paqueteActivo.clasesRestantes <= 2 && a.estado === 'activo'
  ).length;
  const cuentasVencidas = cuentas.filter(c => c.estado === 'vencida').length;
  const presentesHoy    = registros.filter(r => r.presente).length;

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
          ventasHoy={ventasHoy}
          alumnosActivos={alumnosActivos}
          cuentasVencidas={cuentasVencidas}
          presentesHoy={presentesHoy}
          conPocasClases={conPocasClases}
          gastosMes={gastosMes}
        />
      </div>

      {/* Leyenda de espacios */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Salon A', icon: '💃', desc: 'Clases y alquiler', color: '#3b82f6' },
          { label: 'Salon B', icon: '🎭', desc: 'Clases y alquiler', color: '#8b5cf6' },
          { label: 'Salon C', icon: '🎶', desc: 'Clases y alquiler', color: '#06b6d4' },
          { label: 'Cafetín', icon: '☕', desc: 'Area de descanso', color: '#f59e0b' },
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
