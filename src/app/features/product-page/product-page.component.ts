import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { CartStateService } from '../../core/cart-state.service';
import { NotificationService } from '../../core/notification.service';
import { ApiErrorBody, Cart, Product } from '../../core/models';

/**
 * ProductPageComponent — ficha del Product único (tarea 14.1).
 *
 * Responsabilidades:
 * - Al iniciar, consulta el Product vía `ApiService.getProduct()` (Req. 1.1: mostrar
 *   nombre, descripción y precio del producto único).
 * - Si el producto no está disponible (`available === false`) o la petición falla
 *   (p. ej. 404 `PRODUCT_UNAVAILABLE`), muestra un estado de error y NO renderiza la
 *   ficha ni el botón de agregar, evitando mostrar datos parciales (Req. 1.5).
 * - El botón "Agregar al carrito" crea un carrito si no existe y luego agrega el
 *   producto, delegando la persistencia del estado en `CartStateService` (Req. 2.1).
 *
 * Componente standalone: importa solo los módulos de Material que utiliza. El feedback
 * de errores/éxito se delega en `NotificationService` (MatSnackBar).
 */
@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './product-page.component.html',
  styleUrl: './product-page.component.scss',
})
export class ProductPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cartState = inject(CartStateService);
  private readonly notifications = inject(NotificationService);

  /** Producto cargado; `null` mientras carga o si hubo error/no disponible. */
  product: Product | null = null;

  /** Indica que la carga inicial del producto está en curso. */
  loading = true;

  /**
   * Estado de error de la ficha (Req. 1.5). Cuando es distinto de `null`, la plantilla
   * muestra el banner de error y oculta la ficha y el botón de agregar.
   */
  loadError: string | null = null;

  /** Indica que una operación de "Agregar al carrito" está en curso (Req. 2.1). */
  addingToCart = false;

  ngOnInit(): void {
    this.loadProduct();
  }

  /**
   * Carga el producto único desde el catálogo (Req. 1.1).
   *
   * En caso de éxito, si el producto no está disponible se trata como estado de error
   * sin exponer datos parciales (Req. 1.5). Cualquier error del observable (p. ej. 404
   * `PRODUCT_UNAVAILABLE`) también deriva en el estado de error.
   */
  private loadProduct(): void {
    this.loading = true;
    this.loadError = null;
    this.product = null;

    this.api
      .getProduct()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (product) => {
          // Req. 1.5: si el producto no está disponible, mostrar error sin datos parciales.
          if (!product.available) {
            this.loadError = 'El producto no está disponible en este momento.';
            return;
          }
          this.product = product;
        },
        error: (err: HttpErrorResponse) => {
          // Req. 1.5: ante error (incluido 404 PRODUCT_UNAVAILABLE) no se muestran datos parciales.
          this.loadError = this.extractErrorMessage(
            err,
            'El producto no está disponible en este momento.',
          );
        },
      });
  }

  /**
   * Agrega el producto al carrito (Req. 2.1).
   *
   * Si aún no existe un `cartId`, primero crea un carrito, persiste su id vía
   * `CartStateService` y luego agrega el producto; si ya existe, agrega directamente.
   * Actualiza el estado del carrito con el `Cart` retornado y notifica el resultado.
   */
  addToCart(): void {
    // Guarda defensiva: sin producto válido no se permite agregar.
    if (!this.product || this.addingToCart) {
      return;
    }

    this.addingToCart = true;

    const existingCartId = this.cartState.getCartId();

    // Si no hay carrito previo, crearlo primero y luego agregar el producto (Req. 2.1).
    const addToCart$: Observable<Cart> = existingCartId
      ? this.api.addProduct(existingCartId)
      : this.api.createCart().pipe(
          switchMap((cart) => {
            // Persistir el carrito recién creado antes de agregar el producto.
            this.cartState.setCart(cart);
            return this.api.addProduct(cart.id);
          }),
        );

    addToCart$
      .pipe(finalize(() => (this.addingToCart = false)))
      .subscribe({
        next: (cart) => {
          // Actualizar el estado del carrito con la respuesta del backend.
          this.cartState.setCart(cart);
          this.notifications.showSuccess('Producto agregado al carrito.');
        },
        error: (err: HttpErrorResponse) => {
          this.notifications.showError(
            this.extractErrorMessage(
              err,
              'No se pudo agregar el producto al carrito.',
            ),
          );
        },
      });
  }

  /**
   * Formatea un monto entero en CLP sin decimales usando la convención chilena
   * (Req. 1.1/1.2: precio con indicación explícita de la moneda CLP).
   */
  formatClp(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Extrae el mensaje de error del cuerpo de la API (`{ error: { code, message } }`)
   * cuando está disponible; en caso contrario devuelve el mensaje por defecto.
   */
  private extractErrorMessage(err: HttpErrorResponse, fallback: string): string {
    const body = err?.error as ApiErrorBody | undefined;
    const message = body?.error?.message;
    return typeof message === 'string' && message.length > 0 ? message : fallback;
  }
}
