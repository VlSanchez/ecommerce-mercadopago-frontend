import { Injectable } from '@angular/core';

/** URL oficial del SDK MercadoPago.js V2 (no existe paquete npm oficial para Angular). */
const MP_SDK_URL = 'https://sdk.mercadopago.com/js/v2';

/**
 * Tipo mínimo del controller que devuelve `bricks.create(...)`.
 * Solo nos interesa `unmount()` para poder desmontar el Brick al salir de la pantalla.
 * El SDK expone más métodos, pero no los tipamos porque no los usamos.
 */
interface BrickController {
  unmount?: () => void;
}

/**
 * Tipo mínimo del objeto `bricks()` del SDK.
 * `create(brick, containerId, settings)` monta un Brick en el contenedor indicado y
 * devuelve una promesa con el controller para manipularlo (p. ej. desmontarlo).
 */
interface MercadoPagoBricksBuilder {
  create(
    brick: string,
    containerId: string,
    settings: Record<string, unknown>,
  ): Promise<BrickController>;
}

/**
 * Tipo mínimo de la instancia de MercadoPago creada con `new MercadoPago(publicKey, opts)`.
 */
interface MercadoPagoInstance {
  bricks(): MercadoPagoBricksBuilder;
}

/**
 * Firma mínima del constructor global `MercadoPago` que inyecta el SDK en `window`.
 * Usamos este tipo local para evitar `any` sin agregar dependencias npm.
 */
type MercadoPagoConstructor = new (
  publicKey: string,
  options?: { locale?: string },
) => MercadoPagoInstance;

/**
 * MercadoPagoService — carga perezosa del SDK MercadoPago.js V2 y montaje del Wallet Brick.
 *
 * Responsabilidades:
 * - Inyectar el `<script>` del SDK una única vez y exponer el global `MercadoPago`.
 * - Inicializar el SDK con la Public Key (pública) y montar el Wallet Brick de Checkout Pro
 *   a partir del `preferenceId` que devuelve el backend.
 * - Desmontar el Brick al abandonar la pantalla para evitar fugas de DOM/estado.
 *
 * Es un servicio puramente de infraestructura del cliente: no realiza llamadas a la API
 * REST del backend ni gestiona notificaciones (eso lo hacen ApiService / NotificationService).
 * El acceso a `document`/`window` está protegido para entornos sin DOM (p. ej. SSR).
 */
@Injectable({ providedIn: 'root' })
export class MercadoPagoService {
  /** Promesa cacheada de carga del SDK para no insertar el script más de una vez. */
  private sdkPromise: Promise<void> | null = null;

  /** Controller del último Wallet Brick montado, para poder desmontarlo. */
  private walletController: BrickController | null = null;

  /**
   * Carga el SDK MercadoPago.js V2 una sola vez.
   *
   * Resuelve de inmediato si el global `MercadoPago` ya existe o si el script ya se cargó
   * previamente (promesa cacheada). Inserta un `<script>` en `document.head` y resuelve en
   * `onload`; rechaza en `onerror`. En entornos sin `document` rechaza con un error claro.
   */
  loadSdk(): Promise<void> {
    // Ya cargado en una invocación anterior: reutilizamos la promesa cacheada.
    if (this.sdkPromise) {
      return this.sdkPromise;
    }

    // Sin DOM disponible (p. ej. SSR): no podemos inyectar el script.
    if (typeof document === 'undefined') {
      return Promise.reject(new Error('El SDK de MercadoPago requiere un entorno con DOM.'));
    }

    // El global ya existe (script incluido por otra vía): nada que cargar.
    if (this.hasGlobal()) {
      this.sdkPromise = Promise.resolve();
      return this.sdkPromise;
    }

    this.sdkPromise = new Promise<void>((resolve, reject) => {
      // Si ya hay un <script> del SDK en el DOM, esperamos su carga en lugar de duplicarlo.
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${MP_SDK_URL}"]`,
      );
      if (existing) {
        if (this.hasGlobal()) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () =>
          reject(new Error('No se pudo cargar el SDK de MercadoPago.')),
        );
        return;
      }

      const script = document.createElement('script');
      script.src = MP_SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Limpiamos la promesa cacheada para permitir reintentar más tarde.
        this.sdkPromise = null;
        reject(new Error('No se pudo cargar el SDK de MercadoPago.'));
      };
      document.head.appendChild(script);
    });

    return this.sdkPromise;
  }

  /**
   * Monta el Wallet Brick de Checkout Pro en el contenedor indicado.
   *
   * Asegura primero la carga del SDK, luego crea la instancia de MercadoPago con la
   * Public Key (pública), obtiene el builder de bricks y monta el Brick `wallet` a partir
   * del `preferenceId`. Guarda el controller devuelto para poder desmontarlo después.
   *
   * @param containerId id del elemento del DOM donde se renderiza el Brick.
   * @param preferenceId id de la preferencia de MercadoPago devuelto por el backend.
   * @param publicKey Public Key (pública) de la cuenta de MercadoPago.
   */
  async renderWalletBrick(
    containerId: string,
    preferenceId: string,
    publicKey: string,
  ): Promise<void> {
    await this.loadSdk();

    const MercadoPagoCtor = this.getGlobal();
    if (!MercadoPagoCtor) {
      throw new Error('El SDK de MercadoPago no está disponible tras la carga.');
    }

    // Locale es-CL: la tienda opera en CLP (Chile).
    const mp = new MercadoPagoCtor(publicKey, { locale: 'es-CL' });
    const bricks = mp.bricks();

    // Desmontamos cualquier Brick previo antes de montar uno nuevo (evita duplicados).
    this.unmount();

    this.walletController = await bricks.create('wallet', containerId, {
      initialization: { preferenceId },
      customization: { texts: { valueProp: 'smart_option' } },
    });
  }

  /**
   * Desmonta el Wallet Brick actualmente montado, si existe.
   * Se invoca típicamente en `ngOnDestroy` del componente de checkout. Los errores del
   * SDK al desmontar se ignoran (best effort) para no romper la navegación.
   */
  unmount(): void {
    if (this.walletController && typeof this.walletController.unmount === 'function') {
      try {
        this.walletController.unmount();
      } catch {
        // Ignoramos fallos al desmontar: es una limpieza best-effort.
      }
    }
    this.walletController = null;
  }

  /** Indica si el constructor global `MercadoPago` ya está disponible en `window`. */
  private hasGlobal(): boolean {
    return this.getGlobal() !== undefined;
  }

  /**
   * Devuelve el constructor global `MercadoPago` desde `window`, o `undefined` si no está.
   * Usamos `(window as any)` acotado a esta única lectura para no propagar `any`.
   */
  private getGlobal(): MercadoPagoConstructor | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }
    return (window as unknown as { MercadoPago?: MercadoPagoConstructor }).MercadoPago;
  }
}
