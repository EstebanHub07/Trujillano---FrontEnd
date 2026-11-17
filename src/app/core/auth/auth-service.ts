import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Respuesta de POST /api/v1/auth/login (LoginResponseDTO del backend). */
interface LoginResponse {
  token: string;
  tipo: string;
  expiraEnSegundos: number;
  username: string;
  nombreCompleto: string;
  correo: string | null;
  numeroDocumento: string | null;
  roles: string[];
  permisos: string[];
}

export interface Sesion {
  token: string;
  username: string;
  nombreCompleto: string;
  /** Correo del cliente; null si no tiene. Las sesiones guardadas antes de este cambio no lo traen. */
  correo?: string | null;
  /** DNI, RUC o CE; null si no hay. Las sesiones guardadas antes de este cambio no lo traen. */
  numeroDocumento?: string | null;
  roles: string[];
  permisos: string[];
  /** Instante (ms desde 1970) en que el token deja de valer. */
  expiraEn: number;
}

/** Datos para crear la cuenta de cliente (POST /api/v1/auth/registro). */
export interface RegistroCliente {
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  correo: string;
  username: string;
  password: string;
}

const CLAVE = 'trujillano.sesion';

/**
 * Sesión del cliente con JWT. Se guarda en sessionStorage: se pierde al cerrar la pestaña,
 * que es lo más prudente para un token (no queda en disco como localStorage).
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _sesion = signal<Sesion | null>(this.leer());

  readonly sesion = this._sesion.asReadonly();
  readonly autenticado = computed(() => this._sesion() !== null);
  readonly token = computed(() => this._sesion()?.token ?? null);
  readonly correo = computed(() => this._sesion()?.correo ?? null);
  readonly numeroDocumento = computed(() => this._sesion()?.numeroDocumento ?? null);
  /** Primer nombre para saludar en la cabecera. */
  readonly primerNombre = computed(() => this._sesion()?.nombreCompleto.trim().split(/\s+/)[0] ?? '');

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(tap((r) => this.guardar(r)));
  }

  /** Crea la cuenta y deja la sesión iniciada (el backend responde igual que el login). */
  registrar(datos: RegistroCliente): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/registro`, datos)
      .pipe(tap((r) => this.guardar(r)));
  }

  cerrarSesion(): void {
    this._sesion.set(null);
    try {
      sessionStorage.removeItem(CLAVE);
    } catch {
      // Sin almacenamiento: la sesión solo vivía en memoria.
    }
  }

  private guardar(r: LoginResponse): void {
    const sesion: Sesion = {
      token: r.token,
      username: r.username,
      nombreCompleto: r.nombreCompleto,
      correo: r.correo,
      numeroDocumento: r.numeroDocumento,
      roles: r.roles,
      permisos: r.permisos,
      expiraEn: Date.now() + r.expiraEnSegundos * 1000,
    };
    this._sesion.set(sesion);
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
    } catch {
      // Sin almacenamiento: la sesión dura mientras la página esté abierta.
    }
  }

  private leer(): Sesion | null {
    try {
      const datos = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null') as Sesion | null;
      if (datos && typeof datos.token === 'string' && datos.expiraEn > Date.now()) return datos;
      sessionStorage.removeItem(CLAVE);
    } catch {
      // Datos dañados o sin almacenamiento: se empieza sin sesión.
    }
    return null;
  }
}
