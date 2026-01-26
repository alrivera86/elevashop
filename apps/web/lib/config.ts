/**
 * Configuración de branding del sistema
 * Para demo: cambiar estos valores o usar variables de entorno
 */

export const APP_CONFIG = {
  // Nombre de la aplicación (mostrado en títulos, login, etc.)
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Sistema de Gestión',

  // Descripción corta
  appDescription: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Sistema de gestión de inventario y ventas',

  // Mostrar logo (true) o solo texto (false)
  showLogo: process.env.NEXT_PUBLIC_SHOW_LOGO !== 'false',

  // URL del logo (si showLogo es true)
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png',
};
