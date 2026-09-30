import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../../core/api.service';
import { CartStateService } from '../../core/cart-state.service';
import { NotificationService } from '../../core/notification.service';
import { MercadoPagoService } from '../../core/mercadopago.service';
import { ApiErrorBody, Cart } from '../../core/models';
import { environment } from '../../../environments/environment';

/** Id del contenedor del DOM donde el SDK monta el Wallet Brick. */
const WALLET_CONTAINER_ID = 'walletBrick_container';

/**
 * Método de pago ofrecido en la pantalla de checkout.
 * Estructurado como lista para dejar preparado el soporte de más métodos a futuro.
 */
interface PaymentMethod {
  /** Identificador estable del método (p. ej. `mercadopago`). */
  id: string;
  /** Etiqueta visible al usuario. */
  label: string;
  /** Descripción breve del método. */
  description: string;
  /** Nombre del ícono de Material a mostrar. */
  icon: string;
}

/**
 * CheckoutComponent — pantalla de checkout con selector de método y Wallet Brick (Req. 5.3).
 *
 * Ruta `/checkout`. Al entrar obtiene el `cartId` del `CartStateService`; si no hay carrito
 * muestra una notificación y ofrece volver a `/cart`. Con el método "Mercado Pago"
 * preseleccionado, llama a `ApiService.startCheckout` para crear la preferencia en el backend
 * y, con el `preferenceId` devuelto, monta el Wallet Brick de Checkout Pro vía
 * `MercadoPagoService`. Al destruir el componente desmonta el Brick.
 *
 * Solo orquesta: consume `ApiService` (REST), `CartStateService` (estado de cliente),
 * `MercadoPagoService` (SDK/Brick) y `NotificationService` (feedback visual).
 */
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly cartState = inject(CartStateService);
  private readonly notifications = inject(NotificationService);
  private readonly mercadoPago = inject(MercadoPagoService);

  /** Métodos de pago disponibles. Por ahora solo MercadoPago; la lista queda extensible. */
  readonly paymentMethods: PaymentMethod[] = [
    {
      id: 'mercadopago',
      label: 'Mercado Pago',
      description: 'Tarjetas, dinero en cuenta y más medios de pago.',
      icon: 'account_balance_wallet',
    },
  ];

  /** Método de pago seleccionado (preseleccionado en MercadoPago). */
  selectedMethod = 'mercadopago';

  /** `cartId` actual resuelto en `ngOnInit` (o `null` si no hay carrito). */
  cartId: string | null = null;

  /** Snapshot del carrito para mostrar el total (o `null` si no cargó). */
  cart: Cart | null = null;

  /** Indica que se está creando la preferencia y/o montando el Brick. */
  loading = false;

  /** Indica que no hay carrito disponible para pagar. */
  noCart = false;

  /** Id del contenedor del Wallet Brick, expuesto a la plantilla. */
  readonly walletContainerId = WALLET_CONTAINER_ID;

  /**
   * Formateador de moneda CLP (entero, sin decimales), independiente del `LOCALE_ID`.
   */
  private readonly clpFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });

  ngOnInit(): void {
    this.cartId = this.cartState.getCartId();

    // Sin carrito no podemos crear una preferencia: avisamos y ofrecemos volver a /cart.
    if (!this.cartId) {
      this.noCart = true;
      this.notifications.showInfo('No hay un carrito activo. Volvé al carrito para comenzar.');
      return;
    }

    // Cargamos el carrito para mostrar el total (best-effort: si falla, seguimos igual).
    this.api.getCart(this.cartId).subscribe({
      next: (cart) => {
        this.cart = cart;
      },
      error: () => {
        // No bloqueamos el checkout por no poder mostrar el total; el backend valida al crear.
        this.cart = null;
      },
    });

    // Con MercadoPago preseleccionado, iniciamos el flujo de pago automáticamente.
    this.startMercadoPago();
  }

  ngOnDestroy(): void {
    // Desmontamos el Wallet Brick al salir de la pantalla (limpieza de DOM/estado).
    this.mercadoPago.unmount();
  }

  /** Formatea un monto entero CLP para mostrarlo en la plantilla. */
  formatClp(amount: number): string {
    return this.clpFormatter.format(amount);
  }

  /**
   * Handler del cambio de método de pago. Si el método seleccionado es MercadoPago,
   * (re)inicia el flujo de creación de preferencia y montaje del Brick.
   */
  onMethodChange(): void {
    if (this.selectedMethod === 'mercadopago') {
      this.startMercadoPago();
    }
  }

  /**
   * Inicia el pago con MercadoPago (Req. 5.3):
   * 1) crea la preferencia en el backend (`startCheckout`),
   * 2) monta el Wallet Brick con el `preferenceId` devuelto.
   *
   * Maneja el estado de carga y muestra el mensaje del backend ante error.
   */
  private startMercadoPago(): void {
    if (!this.cartId) {
      return;
    }

    this.loading = true;
    this.api.startCheckout(this.cartId).subscribe({
      next: (response) => {
        // Montamos el Brick con el preferenceId; el resultado es una promesa del SDK.
        this.mercadoPago
          .renderWalletBrick(
            WALLET_CONTAINER_ID,
            response.preferenceId,
            environment.mercadoPagoPublicKey,
          )
          .then(() => {
            this.loading = false;
          })
          .catch(() => {
            this.loading = false;
            this.notifications.showError('No se pudo cargar el medio de pago. Intentá nuevamente.');
          });
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.notifications.showError(
          this.extractErrorMessage(err, 'No se pudo iniciar el pago.'),
        );
      },
    });
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
