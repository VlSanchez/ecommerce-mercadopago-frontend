import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../../core/api.service';
import { CartStateService } from '../../core/cart-state.service';
import { NotificationService } from '../../core/notification.service';
import { ApiErrorBody, Cart } from '../../core/models';

/** Cantidad mínima permitida para el ítem del carrito (Req. 3.2). */
const MIN_QUANTITY = 1;
/** Cantidad máxima permitida para el ítem del carrito (Req. 3.2). */
const MAX_QUANTITY = 99;

/**
 * CartComponent — carrito de compras (Req. 3.1, 3.2, 3.3, 3.4, 5.3).
 *
 * Ruta `/cart`. Muestra el ítem del carrito (cantidad, precio unitario y subtotal),
 * permite ajustar la cantidad (entero 1..99), eliminar el ítem y muestra el total en
 * CLP. El botón "Continuar al pago" navega a la pantalla de checkout (`/checkout`),
 * donde se elige el medio de pago y se monta el Wallet Brick de MercadoPago. Este
 * componente ya NO redirige directamente a MercadoPago.
 *
 * Este componente se limita a orquestar: consume `ApiService` (llamadas REST),
 * `CartStateService` (estado de cliente), `NotificationService` (feedback visual) y
 * `Router` (navegación al checkout).
 */
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cartState = inject(CartStateService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  /** Snapshot del carrito actual, o `null` si no hay carrito / aún no cargó. */
  cart: Cart | null = null;

  /** Cantidad enlazada al control de cantidad (ngModel). Es la "cantidad mostrada". */
  quantity = MIN_QUANTITY;

  /** Indica que hay una carga inicial del carrito en curso. */
  loading = false;
  /** Indica que hay una actualización del carrito (cantidad/eliminación) en curso. */
  updating = false;

  /** Límites expuestos a la plantilla para el control de cantidad (Req. 3.2). */
  readonly minQuantity = MIN_QUANTITY;
  readonly maxQuantity = MAX_QUANTITY;

  /**
   * Formateador de moneda CLP (entero, sin decimales), independiente del `LOCALE_ID`
   * de la app. Cumple la exigencia de mostrar el total como entero en CLP (Req. 3.1).
   */
  private readonly clpFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });

  ngOnInit(): void {
    // Al iniciar, intentamos rehidratar el carrito persistido (Req. 3.1).
    const cartId = this.cartState.getCartId();
    if (!cartId) {
      // Sin carrito → estado de carrito vacío.
      return;
    }

    this.loading = true;
    this.api.getCart(cartId).subscribe({
      next: (cart) => {
        this.applyCart(cart);
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        // Si el carrito ya no existe (p. ej. reinicio del backend), limpiamos el estado.
        this.notifications.showError(this.extractErrorMessage(err, 'No se pudo cargar el carrito.'));
        this.cartState.clearCart();
        this.cart = null;
      },
    });
  }

  /** Indica si el carrito está vacío (sin ítems o total 0) — controla el estado vacío (Req. 3.4). */
  get isEmpty(): boolean {
    return !this.cart || this.cart.items.length === 0 || this.cart.total === 0;
  }

  /** El botón "Continuar al pago" se deshabilita si el carrito está vacío o hay operaciones en vuelo (Req. 5.3). */
  get payDisabled(): boolean {
    return this.isEmpty || this.updating || this.loading;
  }

  /** Formatea un monto entero CLP para mostrarlo en la plantilla (Req. 3.1). */
  formatClp(amount: number): string {
    return this.clpFormatter.format(amount);
  }

  /**
   * Handler del cambio de cantidad (Req. 3.2, 3.3).
   *
   * Valida que el valor sea un entero en [1, 99]. Si es inválido, muestra un error y
   * revierte la cantidad mostrada al valor anterior SIN llamar a la API (Req. 3.3). Si
   * es válido, llama a `setQuantity` y, ante éxito, actualiza el estado (Req. 3.2).
   */
  onQuantityChange(value: unknown): void {
    const cartId = this.cartState.getCartId();
    const previous = this.currentQuantity();

    if (!cartId || !this.cart) {
      // Sin carrito no hay nada que ajustar; revertimos por seguridad.
      this.quantity = previous;
      return;
    }

    const parsed = this.parseQuantity(value);

    // Rechazo de valores inválidos: <1, >99 o no entero (Req. 3.3).
    if (parsed === null) {
      this.notifications.showError(
        `La cantidad debe ser un número entero entre ${MIN_QUANTITY} y ${MAX_QUANTITY}.`,
      );
      // Conservar la cantidad anterior sin cambios (Req. 3.3).
      this.quantity = previous;
      return;
    }

    // Si el valor no cambia respecto al actual, evitamos una llamada innecesaria.
    if (parsed === previous) {
      this.quantity = parsed;
      return;
    }

    this.updating = true;
    this.api.setQuantity(cartId, parsed).subscribe({
      next: (cart) => {
        // Fijar la cantidad al valor indicado y sincronizar el estado (Req. 3.2).
        this.applyCart(cart);
        this.cartState.setCart(cart);
        this.updating = false;
      },
      error: (err: HttpErrorResponse) => {
        this.updating = false;
        // Ante error de la API, conservar la cantidad anterior y avisar (Req. 3.3).
        this.quantity = previous;
        this.notifications.showError(
          this.extractErrorMessage(err, 'No se pudo actualizar la cantidad.'),
        );
      },
    });
  }

  /**
   * Elimina el ítem del carrito (Req. 3.4).
   *
   * Ante éxito, el backend devuelve un carrito vacío con total 0; sincronizamos el
   * estado para reflejar el carrito vacío.
   */
  onRemove(): void {
    const cartId = this.cartState.getCartId();
    if (!cartId || !this.cart) {
      return;
    }

    this.updating = true;
    this.api.removeProduct(cartId).subscribe({
      next: (cart) => {
        // Carrito vacío con total 0 (Req. 3.4).
        this.applyCart(cart);
        this.cartState.setCart(cart);
        this.updating = false;
        this.notifications.showSuccess('Producto eliminado del carrito.');
      },
      error: (err: HttpErrorResponse) => {
        this.updating = false;
        this.notifications.showError(
          this.extractErrorMessage(err, 'No se pudo eliminar el producto del carrito.'),
        );
      },
    });
  }

  /**
   * Continúa al pago (Req. 5.3).
   *
   * Ya NO llama al backend ni redirige a MercadoPago: navega a la pantalla de checkout
   * (`/checkout`), donde el Visitor elige el medio de pago y se monta el Wallet Brick.
   * Si el carrito está vacío no hace nada.
   */
  onPay(): void {
    if (this.isEmpty) {
      return;
    }
    this.router.navigate(['/checkout']);
  }

  /** Sincroniza el snapshot local y la cantidad mostrada a partir del carrito recibido. */
  private applyCart(cart: Cart): void {
    this.cart = cart;
    this.quantity = this.deriveQuantity(cart);
  }

  /** Devuelve la cantidad actual del ítem, o `MIN_QUANTITY` si el carrito está vacío. */
  private currentQuantity(): number {
    return this.deriveQuantity(this.cart);
  }

  /** Deriva la cantidad del primer ítem del carrito (producto único), con fallback. */
  private deriveQuantity(cart: Cart | null): number {
    if (cart && cart.items.length > 0) {
      return cart.items[0].quantity;
    }
    return MIN_QUANTITY;
  }

  /**
   * Convierte un valor de entrada a una cantidad entera válida en [1, 99].
   * Devuelve `null` si no es un entero dentro del rango (Req. 3.3).
   */
  private parseQuantity(value: unknown): number | null {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
      return null;
    }
    if (numeric < MIN_QUANTITY || numeric > MAX_QUANTITY) {
      return null;
    }
    return numeric;
  }

  /**
   * Extrae el mensaje de error del cuerpo estándar de la API (`{ error: { code, message } }`),
   * con un mensaje de respaldo cuando el cuerpo no tiene el formato esperado.
   */
  private extractErrorMessage(err: HttpErrorResponse, fallback: string): string {
    const body = err?.error as ApiErrorBody | undefined;
    if (body && body.error && typeof body.error.message === 'string') {
      return body.error.message;
    }
    return fallback;
  }
}
