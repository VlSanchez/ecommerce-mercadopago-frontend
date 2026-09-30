/**
 * Configuración de entorno para desarrollo (reemplaza a environment.ts en dev builds).
 *
 * Apunta al backend Express local. Por defecto el backend escucha en el puerto 3000
 * y monta todos los routers bajo el prefijo `/api` (ver backend/src/config.ts y
 * la tarea 11.4 del plan), por lo que la URL base de la API es http://localhost:3000/api.
 *
 * El frontend NUNCA contiene el MP_ACCESS_TOKEN.
 */
export const environment = {
  production: false,
  /** URL base de la API REST del backend en desarrollo. */
  apiBaseUrl: 'http://localhost:3000/api',
  /**
   * Public Key de PRUEBA de MercadoPago usada por el SDK MercadoPago.js V2 en el navegador.
   *
   * A diferencia del Access Token (secreto, server-side), la Public Key es PÚBLICA:
   * está pensada para vivir en el frontend e identificar la cuenta al inicializar el
   * SDK y montar el Wallet Brick de Checkout Pro.
   */
  mercadoPagoPublicKey: 'APP_USR-2da70ee1-e7c6-491b-9ee0-1edbdda27174',
};
