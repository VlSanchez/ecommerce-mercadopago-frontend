import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CheckoutResultComponent } from './checkout-result.component';

describe('CheckoutResultComponent', () => {
  let component: CheckoutResultComponent;
  let fixture: ComponentFixture<CheckoutResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutResultComponent],
      providers: [provideRouter([]), provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults the result type to "pending"', () => {
    expect(component.result).toBe('pending');
  });
});
