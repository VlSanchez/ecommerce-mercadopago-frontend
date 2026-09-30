import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Cart, CheckoutResponse, Product } from './models';

/**
 * Cliente REST del frontend que encapsula todas las llamadas HTTP al backend
 * (catálogo, carrito y checkout).
 *
 * Responsabilidad única: realizar las peticiones y devolver `Observable<T>`. NO
 * gestiona notificaciones ni feedback de error (eso corresponde a
 * `NotificationService`); los llamadores manejan los errores del observable.
 *
 * Las URLs se construyen con el prefijo `environment.apiBaseUrl` (por defecto `/api`).
 * El `HttpClient` se provee en la raíz vía `provideHttpClient(withFetch())`.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  /** URL base de la API REST del backend. */
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * Obtiene el producto único del catálogo (Req. 1.1).
   * `GET /product` → 200 con el `Product`; 404 `PRODUCT_UNAVAILABLE` si no está disponible.
   */
  getProduct(): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/product`);
  }

  /**
   * Crea un carrito nuevo (Req. 2.1).
   * `POST /cart` → 201 con el `Cart` recién creado.
   */
  createCart(): Observable<Cart> {
    return this.http.post<Cart>(`${this.baseUrl}/cart`, {});
  }

  /**
   * Consulta un carrito por id (Req. 3.1).
   * `GET /cart/:cartId` → 200 con el `Cart`.
   */
  getCart(cartId: string): Observable<Cart> {
    return this.http.get<Cart>(`${this.baseUrl}/cart/${encodeURIComponent(cartId)}`);
  }

  /**
   * Agrega el producto al carrito incrementando la cantidad en 1 (Req. 2.1).
   * `POST /cart/:cartId/items` → 200 con el `Cart` (máximo 99).
   */
  addProduct(cartId: string): Observable<Cart> {
    return this.http.post<Cart>(
      `${this.baseUrl}/cart/${encodeURIComponent(cartId)}/items`,
      {},
    );
  }

  /**
   * Fija la cantidad del producto en el carrito (Req. 3.1).
   * `PATCH /cart/:cartId/items` con `{ quantity }` → 200 con el `Cart` (cantidad 1..99).
   */
  setQuantity(cartId: string, quantity: number): Observable<Cart> {
    return this.http.patch<Cart>(
      `${this.baseUrl}/cart/${encodeURIComponent(cartId)}/items`,
      { quantity },
    );
  }

  /**
   * Elimina el producto del carrito, dejándolo vacío con total 0 (Req. 3.1).
   * `DELETE /cart/:cartId/items` → 200 con el `Cart` vacío.
   */
  removeProduct(cartId: string): Observable<Cart> {
    return this.http.delete<Cart>(
      `${this.baseUrl}/cart/${encodeURIComponent(cartId)}/items`,
    );
  }

  /**
   * Inicia el checkout para un carrito (Req. 5.3).
   * `POST /checkout` con `{ cartId }` → 200 con `{ checkoutUrl, orderId }`.
   */
  startCheckout(cartId: string): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.baseUrl}/checkout`, { cartId });
  }
}
