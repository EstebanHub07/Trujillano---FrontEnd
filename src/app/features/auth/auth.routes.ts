import { Routes } from '@angular/router';
import { autenticadoGuard } from '../../core/auth/auth-guard';
import { Cuenta } from './pages/cuenta/cuenta';
import { Login } from './pages/login/login';
import { Registro } from './pages/registro/registro';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: Login, title: 'Ingresar · El Trujillano' },
  { path: 'registro', component: Registro, title: 'Crear cuenta · El Trujillano' },
  { path: 'cuenta', component: Cuenta, canActivate: [autenticadoGuard], title: 'Mi cuenta · El Trujillano' },
];
