import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CheckoutComponent } from './checkout.component';
import { MercadoPagoService } from '../../core/mercadopago.service';

/**
 * Mock de MercadoPagoService: evita cargar el script real del SDK y montar el Brick
 * durante las pruebas. Todos los métodos resuelven vacío / son no-op, de modo que el
 * test no depende de la red ni del SDK real de MercadoPago.
 */
class MercadoPagoServiceStub {
  loadSdk(): Promise<void> {
    return Promise.resolve();
  }
  renderWalletBrick(): Promise<void> {
    return Promise.resolve();
  }
  unmount(): void {
    // no-op en pruebas
  }
}

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MercadoPagoService, useClass: MercadoPagoServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
