import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth-service';
import { mensajeError } from '../../../../core/utils/https-errors';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Pantalla a la que volver tras ingresar (?returnUrl=), enlazada con withComponentInputBinding. */
  readonly returnUrl = input<string>();

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verClave = signal(false);

  protected ingresar(evento: Event, usuario: string, clave: string): void {
    evento.preventDefault();
    if (!usuario.trim() || !clave) {
      this.error.set('Escribe tu usuario y tu contraseña.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.auth.login(usuario.trim(), clave).subscribe({
      next: () => void this.router.navigateByUrl(this.destino()),
      error: (e: HttpErrorResponse) => {
        this.error.set(e.status === 401 ? 'Usuario o contraseña incorrectos.' : mensajeError(e));
        this.enviando.set(false);
      },
    });
  }

  /** Solo rutas internas: evita redirigir a otro sitio con un returnUrl manipulado. */
  private destino(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/catalogo';
  }
}
