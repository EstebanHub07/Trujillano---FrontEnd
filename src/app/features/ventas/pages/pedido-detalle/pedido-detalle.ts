import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth-service';
import { mensajeError } from '../../../../core/utils/https-errors';
import { Pedido } from '../../models/pedido.model';
import { CulqiService } from '../../services/culqi-service';
import { PagoService } from '../../services/pago-service';
import { PedidoService } from '../../services/pedido-service';
import { ESTADOS_PAGADOS, explicacionDe, tonoDe } from '../../utils/estado-pedido';

/** Mismo valor que ventas.pedido.expiracion.minutos del backend. */
const MINUTOS_PARA_PAGAR = 30;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-pedido-detalle',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './pedido-detalle.html',
  styleUrl: './pedido-detalle.css',
})
export class PedidoDetalle {
  private readonly pedidoService = inject(PedidoService);
  private readonly pagoService = inject(PagoService);
  private readonly culqi = inject(CulqiService);
  private readonly auth = inject(AuthService);

  /** Parámetro :id de la ruta, enlazado con withComponentInputBinding. */
  readonly id = input.required<string>();

  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly pagando = signal(false);
  protected readonly errorPago = signal<string | null>(null);
  protected readonly culqiListo = this.culqi.configurado;
  /** Correo de la cuenta: se usa para el cobro sin volver a pedirlo. */
  protected readonly correoCuenta = this.auth.correo;
  /** Solo si la cuenta no tiene correo (p. ej. la creó un empleado): el que escribe el cliente. */
  protected readonly correoManual = signal('');

  protected readonly fechaImpresion = new Date();
  protected readonly cliente = computed(() => this.auth.sesion()?.nombreCompleto ?? '');
  /** Tipo según la longitud del número: 8 DNI, 11 RUC, 12 carnet de extranjería. */
  protected readonly documento = computed(() => {
    const numero = this.auth.numeroDocumento();
    if (!numero) return null;
    const tipo = ({ 8: 'DNI', 11: 'RUC', 12: 'CE' } as Record<number, string>)[numero.length] ?? 'Documento';
    return { tipo, numero };
  });

  protected readonly tono = tonoDe;
  protected readonly explicacion = explicacionDe;

  protected readonly pagado = computed(() => ESTADOS_PAGADOS.includes(this.pedido()?.estado.codigo ?? ''));
  /** Número con ceros a la izquierda: 12 → "000012". */
  protected readonly numero = computed(() => String(this.pedido()?.idPedido ?? '').padStart(6, '0'));
  protected readonly unidades = computed(() =>
    (this.pedido()?.detalles ?? []).reduce((suma, d) => suma + d.cantidad, 0),
  );
  /** Hora límite para pagar: pasada, el backend cancela el pedido y devuelve el stock. */
  protected readonly vence = computed(() => {
    const pedido = this.pedido();
    return pedido ? new Date(new Date(pedido.fechaRegistro).getTime() + MINUTOS_PARA_PAGAR * 60_000) : null;
  });

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(() => this.cargar(id));
    });
  }

  protected cargar(id = Number(this.id()), silencioso = false): void {
    if (!silencioso) {
      this.cargando.set(true);
      this.pedido.set(null);
    }
    this.error.set(null);
    this.pedidoService.obtener(id).subscribe({
      next: (pedido) => {
        this.pedido.set(pedido);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.status === 404 ? 'No encontramos este pedido.' : mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  protected pagar(evento: Event): void {
    evento.preventDefault();
    const pedido = this.pedido();
    if (!pedido || this.pagando()) return;
    const email = (this.correoCuenta() ?? this.correoManual()).trim();
    if (!CORREO.test(email)) {
      this.errorPago.set('Escribe un correo electrónico válido.');
      return;
    }
    this.errorPago.set(null);
    // El botón sigue activo mientras el formulario de Culqi está abierto, por si el cliente lo cierra.
    this.culqi.pedirToken(
      pedido.total,
      (token) => this.enviarPago(pedido, email, token),
      (mensaje) => this.errorPago.set(mensaje),
    );
  }

  protected imprimirComprobante(): void {
    window.print();
  }

  private enviarPago(pedido: Pedido, email: string, token: string): void {
    this.pagando.set(true);
    this.pagoService.pagarConCulqi({ pedidoId: pedido.idPedido, token, email }).subscribe({
      next: (pago) => {
        this.pagando.set(false);
        if (pago.estado.codigo !== 'APROBADO') {
          this.errorPago.set(pago.mensaje ?? 'El pago no fue aprobado. Puedes intentarlo de nuevo.');
        }
        this.cargar(pedido.idPedido, true);
      },
      error: (e: HttpErrorResponse) => {
        this.pagando.set(false);
        this.errorPago.set(mensajeError(e));
        this.cargar(pedido.idPedido, true);
      },
    });
  }
}
