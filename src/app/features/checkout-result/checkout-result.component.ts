import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CartStateService } from '../../core/cart-state.service';

/** Tipos de resultado de retorno a los que MercadoPago redirige vía `back_urls`. */
export type CheckoutResultType = 'success' | 'failure' | 'pending';

/**
 * CheckoutResultComponent — pantallas de retorno del pago (tarea 14.3).
 *
 * Sirve las tres rutas de resultado (`/checkout/success`, `/checkout/failure`,
 * `/checkout/pending`) que son los destinos de las `back_urls` que MercadoPago usa
 * para redirigir al Visitor tras el pago. El tipo concreto se recibe vía `data.result`
 * en la definición de rutas.
 *
 * Estas son pantallas puramente informativas: el estado real de la Order lo resuelve
 * el backend a través del webhook (tareas 9/11), por lo que aquí NO se llama a ninguna
 * API. Cada tipo de resultado renderiza una `mat-card` distinta:
 * - `success` (Req. 6.1): confirma que el pago fue aprobado.
 * - `failure` (Req. 6.2): informa que el pago fue rechazado, con opción de reintentar.
 * - `pending` (Req. 6.3): informa que el pago está pendiente de confirmación.
 */
@Component({
  selector: 'app-checkout-result',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './checkout-result.component.html',
  styleUrl: './checkout-result.component.scss',
})
export class CheckoutResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cartState = inject(CartStateService);

  /** Tipo de resultado resuelto desde la data de la ruta (por defecto `pending`). */
  readonly result: CheckoutResultType =
    (this.route.snapshot.data['result'] as CheckoutResultType) ?? 'pending';

  // Req. 6.x — Configurar URLs de retorno: al redirigir al Visitor tras el pago,
  // MercadoPago agrega estos query params a la `back_url` correspondiente. Son
  // opcionales: si el Visitor llega directo a la ruta (sin pasar por el checkout)
  // quedarán en `null` y simplemente no se muestran.
  /** Identificador del pago (`payment_id`) que envía MercadoPago vía back_urls. */
  paymentId: string | null = null;
  /** Estado del pago (`status`) reportado por MercadoPago vía back_urls. */
  status: string | null = null;
  /** Referencia externa (`external_reference`) asociada a la operación. */
  externalReference: string | null = null;
  /** Identificador de la orden comercial (`merchant_order_id`) de MercadoPago. */
  merchantOrderId: string | null = null;

  ngOnInit(): void {
    // Req. 6.x: leemos los query params que MercadoPago adjunta a la back_url al
    // redirigir tras el pago. Cualquiera puede venir ausente, por eso `get(...)`
    // devuelve `null` y lo tratamos como opcional.
    const params = this.route.snapshot.queryParamMap;
    this.paymentId = params.get('payment_id');
    this.status = params.get('status');
    this.externalReference = params.get('external_reference');
    this.merchantOrderId = params.get('merchant_order_id');

    // Req. 6.1: ante un pago aprobado el flujo termina; se limpia el estado de cliente
    // del carrito para que el Visitor comience una nueva compra desde cero.
    if (this.result === 'success') {
      this.cartState.clearCart();
    }
  }

  /**
   * Indica si hay detalles de operación para mostrar. Solo renderizamos el bloque
   * de detalles cuando MercadoPago envió al menos el `payment_id` o el
   * `merchant_order_id`; de lo contrario (acceso directo) lo omitimos.
   */
  get hasOperationDetails(): boolean {
    return this.paymentId !== null || this.merchantOrderId !== null;
  }
}
