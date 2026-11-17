import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';

/** Deja pasar solo con sesión; si no, lleva al login y vuelve a la pantalla pedida. */
export const autenticadoGuard: CanActivateFn = (_ruta, estado) => {
  if (inject(AuthService).autenticado()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: estado.url } });
};
