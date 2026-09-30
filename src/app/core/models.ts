/**
 * Modelos de dominio del frontend que reflejan los contratos REST del backend.
 *
 * NOTA: estas interfaces son una copia intencional de los modelos del backend
 * (design.md → Data Models). El frontend NO importa código del backend; solo
 * describe la forma de los datos que viajan por la API REST para tipar las
 * respuestas del `HttpClient`.
 */

/**
 * Producto único del catálogo (Req. 1.1).
 * Precio entero en CLP; `available === false` implica que no puede comprarse.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  /** entero CLP */
  price: number;
  currency: 'CLP';
  available: boolean;
  /** URL de la imagen del producto (se envía como picture_url en la preferencia de MercadoPago). */
  imageUrl: string;
}

/**
 * Ítem del carrito (Req. 2.1, 3.1).
 * `subtotal = unitPrice * quantity` con `quantity` entero en [1, 99].
 */
export interface CartItem {
  productId: string;
  /** entero, 1..99 */
  quantity: number;
  /** precio unitario en CLP */
  unitPrice: number;
  /** unitPrice * quantity */
  subtotal: number;
}

/**
 * Carrito de compras (Req. 2.1, 3.1).
 * Con carrito vacío `items` está vacío y `total === 0`.
 */
export interface Cart {
  /** UUID único, no reutilizable durante la vida del proceso. */
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
 * Respuesta de inicio de checkout (Req. 5.3).
 *
 * - `checkoutUrl`: el `init_point` de MercadoPago (redirección directa, flujo legado).
 * - `orderId`: identificador de la Order comercial creada en el backend.
 * - `preferenceId`: id de la preferencia de MercadoPago; lo necesita el Wallet Brick
 *   (Checkout Pro embebido) para renderizarse en el frontend.
 */
export interface CheckoutResponse {
  checkoutUrl: string;
  orderId: string;
  preferenceId: string;
}

/**
 * Forma consistente del cuerpo de error de la API.
 * El backend responde `{ error: { code, message } }` con códigos HTTP 400/404/409/500/502.
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
