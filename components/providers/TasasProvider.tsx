'use client';

/**
 * components/providers/TasasProvider.tsx
 * Proveedor global de tasas de cambio
 * Actualiza automáticamente cada 30 minutos y expone tasas via Context
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import { TasasCambio, TASAS_DEMO, obtenerTodasLasTasas } from '@/lib/tasas';
import { useTasasStore } from '@/lib/store';

interface TasasContextType {
    tasas: TasasCambio;
    cargando: boolean;
    refrescar: () => Promise<void>;
    ultimaActualizacion: Date | null;
}

const TasasContext = createContext<TasasContextType | undefined>(undefined);

// Intervalo de actualización: 30 minutos
const INTERVALO_MS = 30 * 60 * 1000;

export function TasasProvider({ children }: { children: ReactNode }) {
    const [tasas, setTasas] = useState<TasasCambio>(TASAS_DEMO);
    const [cargando, setCargando] = useState(true);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

    // Actualizar el store global también
    const { setTasas: setTasasStore, setCargando: setCargandoStore } = useTasasStore();

    const refrescar = useCallback(async () => {
        try {
            setCargando(true);
            setCargandoStore(true);
            const nuevasTasas = await obtenerTodasLasTasas();
            setTasas(nuevasTasas);
            setTasasStore(nuevasTasas);
            setUltimaActualizacion(new Date());
        } catch (error) {
            console.error('Error actualizando tasas:', error);
        } finally {
            setCargando(false);
            setCargandoStore(false);
        }
    }, [setTasasStore, setCargandoStore]);

    useEffect(() => {
        // Carga inicial
        refrescar();

        // Actualización automática cada 30 min
        const intervalo = setInterval(refrescar, INTERVALO_MS);

        return () => clearInterval(intervalo);
    }, [refrescar]);

    return (
        <TasasContext.Provider value={{ tasas, cargando, refrescar, ultimaActualizacion }}>
            {children}
        </TasasContext.Provider>
    );
}

export function useTasas() {
    const context = useContext(TasasContext);
    if (!context) throw new Error('useTasas debe usarse dentro de TasasProvider');
    return context;
}
