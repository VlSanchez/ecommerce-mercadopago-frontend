/**
 * ConfiguraciÃƒÂ³n de entorno para producciÃƒÂ³n (build por defecto).
 *
 * `apiBaseUrl` es la URL base de la API REST del backend que el frontend consume.
 * El frontend NUNCA contiene el MP_ACCESS_TOKEN: toda la comunicaciÃƒÂ³n con MercadoPago
 * ocurre server-side. Referencia de diseÃƒÂ±o: design.md Ã¢â€ â€™ Frontend / decisiones clave.
 *
 * IMPORTANTE Ã¢â‚¬â€ valores reales provistos por el Operator:
 * En este despliegue el Backend corre en Railway y el Frontend en Vercel (dominios
 * SEPARADOS), por lo que `apiBaseUrl` NO puede ser relativo (`/api` apuntarÃƒÂ­a al host
 * del propio Frontend). Debe ser la URL ABSOLUTA pÃƒÂºblica del Backend. El Operator
 * reemplaza los placeholders de `apiBaseUrl` y `mercadoPagoPublicKey` por los valores
 * productivos reales antes de publicar (ver tasks 6.1 y 11.2 del spec).
 */
export const environment = {
  production: true,
  /**
   * URL base ABSOLUTA de la API REST del backend (los routers se montan bajo `/api`).
   *
   * PLACEHOLDER Ã¢â‚¬â€ el Operator lo reemplaza por la URL pÃƒÂºblica real del Backend:
   *   - URL por defecto de Railway:   https://<app>.up.railway.app/api
   *   - Dominio propio (alternativa): https://api.<dominio>.dev/api
   */
  apiBaseUrl: 'https://ecommerce-mercadopago-backend-production.up.railway.app/api',
  /**
   * Public Key de MercadoPago usada por el SDK MercadoPago.js V2 en el navegador.
   *
   * A diferencia del Access Token (secreto, server-side), la Public Key es PÃƒÅ¡BLICA:
   * estÃƒÂ¡ pensada para vivir en el frontend e identificar la cuenta al inicializar el
   * SDK y montar el Wallet Brick de Checkout Pro.
   *
   * PLACEHOLDER Ã¢â‚¬â€ el Operator lo reemplaza por la Public Key PRODUCTIVA de la cuenta
   * principal de MercadoPago (prefijo `APP_USR-`). No debe quedar la Public Key de
   * prueba hardcodeada en el build de producciÃƒÂ³n.
   */
  mercadoPagoPublicKey: 'APP_USR-<public-key-productiva>',
};
