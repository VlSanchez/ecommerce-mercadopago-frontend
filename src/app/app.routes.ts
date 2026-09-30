import { Routes } from '@angular/router';
import { ProductPageComponent } from './features/product-page/product-page.component';
import { CartComponent } from './features/cart/cart.component';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { CheckoutResultComponent } from './features/checkout-result/checkout-result.component';

/**
 * Enrutamiento base de la app (tarea 12 — scaffolding).
 *
 * - `''` (por defecto): página del producto (Req. 1.1).
 * - `cart`: carrito de compras.
 * - `checkout`: pantalla de checkout con selector de método y Wallet Brick (Req. 5.3).
 * - `checkout/success|failure|pending`: pantallas de retorno del pago; son los
 *   destinos de las `back_urls` que MercadoPago usa para redirigir al Visitor.
 *   El tipo de resultado se pasa vía `data.result` y lo consume CheckoutResultComponent.
 *
 * NOTA sobre el orden: `checkout` (exacto) y `checkout/success|failure|pending` son paths
 * distintos, así que su orden relativo no genera colisión. Lo único crítico es mantener el
 * comodín `**` al final para que no capture rutas válidas.
 */
export const routes: Routes = [
  { path: '', component: ProductPageComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  {
    path: 'checkout/success',
    component: CheckoutResultComponent,
    data: { result: 'success' },
  },
  {
    path: 'checkout/failure',
    component: CheckoutResultComponent,
    data: { result: 'failure' },
  },
  {
    path: 'checkout/pending',
    component: CheckoutResultComponent,
    data: { result: 'pending' },
  },
  // Cualquier otra ruta redirige a la página del producto.
  { path: '**', redirectTo: '' },
];
