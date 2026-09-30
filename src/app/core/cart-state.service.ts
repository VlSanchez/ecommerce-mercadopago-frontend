import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Tipo local del ítem del carrito.
 *
 * NOTA: refleja el contrato del backend (`backend/src/models/cart.ts` → `CartItem`).
 * Se define aquí de forma local para mantener `CartStateService` desacoplado de
 * `core/models.ts` (tarea 13.1). Una tarea posterior puede consolidar estos tipos.
 */
export interface CartItem {
  productId: string;
  /** entero, 1..99 */
  quantity: number;
  /** precio unitario (2000 CLP) */
  unitPrice: number;
  /** unitPrice * quantity */
  subtotal: number;
}

/**
 * Tipo local del carrito.
 *
 * NOTA: refleja el contrato del backend (`backend/src/models/cart.ts` → `Cart`).
 * Se define aquí de forma local para no acoplar este servicio a `core/models.ts`.
 */
export interface Cart {
  /** UUID único del carrito. */
  id: string;
  /** 0 o 1 ítem (producto único). */
  items: CartItem[];
  /** suma de subtotales, entero CLP. */
  total: number;
  currency: 'CLP';
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

/**
 * Clave estable bajo la que se persiste el `cartId` en `localStorage`.
 */
const CART_ID_STORAGE_KEY = 'ecommerce_cart_id';

/**
 * CartStateService — estado de cliente del carrito.
 *
 * Responsabilidades (Req. 2.1, 3.1):
 * - Mantener el `cartId` persistido en `localStorage` para sobrevivir recargas de página.
 * - Exponer el estado observable del carrito (`cart$`) para que los componentes reaccionen.
 *
 * Este servicio SOLO mantiene estado de cliente: NO realiza llamadas HTTP. Los componentes
 * cablearán los resultados de `ApiService` (tarea 13.1) hacia aquí (tarea 14). El acceso a
 * `localStorage` está protegido defensivamente para entornos sin `localStorage` (p. ej. SSR).
 */
@Injectable({ providedIn: 'root' })
export class CartStateService {
  /** Snapshot observable del carrito actual (o `null` si no hay carrito). */
  private readonly cartSubject = new BehaviorSubject<Cart | null>(null);
  /** Estado observable del carrito para consumo de los componentes (Req. 2.1, 3.1). */
  readonly cart$: Observable<Cart | null> = this.cartSubject.asObservable();

  /** Identificador observable del carrito persistido (o `null`). */
  private readonly cartIdSubject = new BehaviorSubject<string | null>(null);
  /** `cartId` observable para consumo de los componentes. */
  readonly cartId$: Observable<string | null> = this.cartIdSubject.asObservable();

  constructor() {
    // Rehidratar el `cartId` persistido al iniciar (Req. 2.1).
    const persisted = this.readStoredCartId();
    if (persisted) {
      this.cartIdSubject.next(persisted);
    }
  }

  /**
   * Devuelve el `cartId` actual (o `null` si no existe).
   */
  getCartId(): string | null {
    return this.cartIdSubject.value;
  }

  /**
   * Establece el `cartId`, lo persiste en `localStorage` y actualiza el estado (Req. 2.1).
   */
  setCartId(id: string): void {
    this.writeStoredCartId(id);
    this.cartIdSubject.next(id);
  }

  /**
   * Actualiza el snapshot del carrito actual y deriva/persiste su id (Req. 3.1).
   */
  setCart(cart: Cart): void {
    this.cartSubject.next(cart);
    if (cart.id && cart.id !== this.cartIdSubject.value) {
      this.setCartId(cart.id);
    }
  }

  /**
   * Vacía el estado del carrito: elimina el `cartId` de `localStorage` y
   * reinicia el estado observable a `null`.
   */
  clearCart(): void {
    this.removeStoredCartId();
    this.cartIdSubject.next(null);
    this.cartSubject.next(null);
  }

  /**
   * Lee el `cartId` de `localStorage` de forma defensiva.
   * Devuelve `null` si `localStorage` no está disponible o si la lectura falla.
   */
  private readStoredCartId(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(CART_ID_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Escribe el `cartId` en `localStorage` de forma defensiva (no propaga errores).
   */
  private writeStoredCartId(id: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(CART_ID_STORAGE_KEY, id);
    } catch {
      // Ignorar fallos de persistencia (p. ej. modo privado / cuota excedida).
    }
  }

  /**
   * Elimina el `cartId` de `localStorage` de forma defensiva (no propaga errores).
   */
  private removeStoredCartId(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(CART_ID_STORAGE_KEY);
    } catch {
      // Ignorar fallos de eliminación.
    }
  }
}
