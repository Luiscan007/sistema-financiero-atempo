// lib/roles.ts

export type RolUsuario = 'admin' | 'recepcionista' | 'profesor';

// Definimos a qué rutas (URLs) tiene acceso cada rol
export const PERMISOS_POR_ROL: Record<RolUsuario, string[]> = {
  admin: [
    '/dashboard', '/punto-venta', '/alumnos', '/asistencia', 
    '/inventario', '/ventas', '/gastos', '/contabilidad', 
    '/cuentas-cobrar', '/agenda', '/conciliacion'
  ],
  recepcionista: [
    '/punto-venta', '/alumnos', '/asistencia', '/agenda'
  ],
  profesor: [
    '/agenda', '/asistencia'
  ]
};

// Rutas por defecto a las que son enviados al hacer login
export const RUTA_INICIO_ROL: Record<RolUsuario, string> = {
  admin: '/dashboard',
  recepcionista: '/punto-venta',
  profesor: '/agenda'
};

export const tienePermiso = (rol: RolUsuario, ruta: string) => {
  // Si es admin, dejamos que pase a todo por defecto, o validamos contra su array
  return PERMISOS_POR_ROL[rol]?.includes(ruta) || false;
};
