export type RolUsuario = 'admin' | 'recepcionista' | 'profesor';

// Rutas exactas a las que tiene acceso cada rol
export const PERMISOS_POR_ROL: Record<RolUsuario, string[]> = {
  admin: [
    '/dashboard', '/pos', '/estudio', '/clientes', '/asistencia', 
    '/inventario', '/ventas', '/gastos', '/contabilidad', 
    '/cuentas', '/agenda', '/cambio', '/conciliacion', 
    '/configuracion', '/whatsapp'
  ],
  recepcionista: [
    '/pos', '/clientes', '/asistencia', '/agenda'
  ],
  profesor: [
    '/asistencia', '/agenda', '/estudio'
  ]
};

// A dónde los manda el sistema justo después de hacer login
export const RUTA_INICIO_ROL: Record<RolUsuario, string> = {
  admin: '/dashboard',
  recepcionista: '/pos',
  profesor: '/agenda'
};

export const tienePermiso = (rol: string | undefined, ruta: string) => {
  if (!rol) return false;
  if (rol === 'admin') return true; // El admin tiene pase libre
  
  // Verificamos si la ruta actual está en el array de su rol
  return PERMISOS_POR_ROL[rol as RolUsuario]?.some(r => ruta.startsWith(r)) || false;
};
