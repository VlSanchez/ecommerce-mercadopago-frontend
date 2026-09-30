import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

/**
 * NotificationService — feedback visual al usuario mediante Angular Material.
 *
 * Responsabilidad (Req. 2.1, 3.1): mostrar mensajes de error y confirmación usando
 * `MatSnackBar`. Es un servicio puramente de presentación: no contiene lógica de negocio
 * ni realiza llamadas HTTP. Los componentes lo invocan para informar el resultado de las
 * operaciones del carrito (agregar, ajustar cantidad, eliminar, etc.).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  /** Etiqueta de la acción para cerrar/descartar el snackbar. */
  private readonly dismissAction = 'Cerrar';

  /**
   * Muestra un mensaje de error.
   *
   * Se mantiene visible más tiempo y con acción de cierre explícita para que el usuario
   * pueda leerlo con calma (Req. 2.1, 3.1: feedback de errores).
   */
  showError(message: string): void {
    const config: MatSnackBarConfig = {
      duration: 8000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['app-snackbar-error'],
    };
    this.snackBar.open(message, this.dismissAction, config);
  }

  /**
   * Muestra un mensaje de confirmación/éxito con auto-cierre breve (Req. 2.1, 3.1).
   */
  showSuccess(message: string): void {
    const config: MatSnackBarConfig = {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['app-snackbar-success'],
    };
    this.snackBar.open(message, this.dismissAction, config);
  }

  /**
   * Muestra un mensaje informativo con auto-cierre breve.
   */
  showInfo(message: string): void {
    const config: MatSnackBarConfig = {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['app-snackbar-info'],
    };
    this.snackBar.open(message, this.dismissAction, config);
  }
}
