import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth-service';

@Component({
  selector: 'app-cuenta',
  imports: [RouterLink],
  templateUrl: './cuenta.html',
  styleUrl: './cuenta.css',
})
export class Cuenta {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sesion = this.auth.sesion;

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/catalogo');
  }
}
