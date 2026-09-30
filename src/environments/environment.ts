/**
 * Configuración de entorno para producción (build por defecto).
 *
 * `apiBaseUrl` es la URL base de la API REST del backend que el frontend consume.
 * El frontend NUNCA contiene el MP_ACCESS_TOKEN: toda la comunicación con MercadoPago
 * ocurre server-side. Referencia de diseño: design.md → Frontend / decisiones clave.
 *
 * En un despliegue real este valor se reemplaza por la URL pública del backend
 * (p. ej. https://api.mi-dominio.com/api).
 */
export const environment = {
  production: true,
  /** URL base de la API REST del backend (los routers se montan bajo `/api`). */
  apiBaseUrl: '/api',
  /**
   * Public Key de MercadoPago usada por el SDK MercadoPago.js V2 en el navegador.
   *
   * A diferencia del Access Token (secreto, server-side), la Public Key es PÚBLICA:
   * está pensada para vivir en el frontend e identificar la cuenta al inicializar el
   * SDK y montar el Wallet Brick de Checkout Pro.
   *
   * NOTA: por ahora se usa la Public Key de PRUEBA. En producción debe reemplazarse
   * por la Public Key productiva de la cuenta de MercadoPago.
   */
  mercadoPagoPublicKey: 'APP_USR-2da70ee1-e7c6-491b-9ee0-1edbdda27174',
};
