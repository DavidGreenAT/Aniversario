import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone,
  ViewChild, afterNextRender, computed, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { AmorcitoService } from '../services/amorcito-service';
import type { Lugar, Mundo3D } from './mundo3d';

interface Respuestas { parque: string; mirador: string; libro: string; }
type Correo = 'sin_enviar' | 'pendiente' | 'enviado' | 'sin_confirmar';
interface RespuestaAPI { ok: boolean; guardado?: boolean; correo?: Correo; mensaje?: string; }

@Component({
  selector: 'app-puzzle3', standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './puzzle3.html', styleUrl: './puzzle3.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Puzzle3 {
  @ViewChild('escenario', { static: true }) escenario!: ElementRef<HTMLDivElement>;
  @ViewChild('dialogo', { static: true }) dialogo!: ElementRef<HTMLDialogElement>;
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly amorcito = inject(AmorcitoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly storageKey = 'amorcito_puzzle3_maravillas_v1';
  // Cambia este valor por la URL HTTPS de tu backend cuando publiques.
  private readonly api = 'http://localhost:3000';
  private motor?: Mundo3D;
  private partidaId = '';
  private clave = '';
  private sondeo?: ReturnType<typeof setTimeout>;
  private inicioEnvio = 0;

  readonly lugares: { id: Lugar; nombre: string; subtitulo: string; pregunta: string; pista: string; campo: keyof Respuestas }[] = [
    { id: 'parque', nombre: 'El parque del primer día', subtitulo: 'Un lago que guarda lo que sentiste.',
      pregunta: '¿Qué siempre quisiste decirme el primer día que fuimos novios?',
      pista: 'La primera esfera te espera junto al sendero, detrás del lago. Rodéalo por la derecha.', campo: 'parque' },
    { id: 'mirador', nombre: 'El mirador de nuestro futuro', subtitulo: 'La ciudad brilla por todo lo que viene.',
      pregunta: '¿Por qué este mirador representa un futuro entre nosotros?',
      pista: 'Camina hacia el barandal y busca junto al telescopio, a la derecha.', campo: 'mirador' },
    { id: 'libreria', nombre: 'La librería de nuestros recuerdos', subtitulo: 'Hay historias que empiezan con un regalo.',
      pregunta: '¿Cómo se llama el primer libro que te regalé?',
      pista: 'Cruza el pasillo central. La última esfera está delante de la mesa de lectura.', campo: 'libro' }
  ];
  readonly indice = signal(0);
  readonly actual = computed(() => this.lugares[this.indice()]!);
  readonly respuestas = signal<Respuestas>({ parque: '', mirador: '', libro: '' });
  readonly recogidos = signal<Lugar[]>([]);
  readonly finalizado = computed(() => this.recogidos().length === 3);
  readonly actualRecogido = computed(() => this.recogidos().includes(this.actual().id));
  readonly iniciado = signal(false);
  readonly cargando3d = signal(true);
  readonly error3d = signal('');
  readonly sin3d = signal(false);
  readonly cerca = signal(false);
  readonly pistaVisible = signal(false);
  readonly borrador = signal('');
  readonly errorRespuesta = signal('');
  readonly validando = signal(false);
  readonly correo = signal<Correo>('sin_enviar');
  readonly comprobandoEnvio = signal(false);
  readonly errorEnvio = signal('');
  readonly guardadoServidor = signal(false);
  readonly cartaAbierta = signal(false);
  readonly cartaGuardada = signal(false);
  readonly avisoLocal = signal('');
  readonly errorCarta = signal('');
  readonly invitacionValida = signal(false);
  readonly tituloCarta = 'Tres maravillas. Un hogar contigo.';
  readonly textoCarta = `Mi Ariana:

Buscaste tres pequeños ojos, pero en cada lugar encontraste algo mucho más grande: una parte de nosotros.

En el parque quedó lo que sentiste al comenzar. En el mirador, todo lo que imaginas para nuestro futuro. Y entre los libros, ese recuerdo que ya forma parte de nuestra historia.

No necesito un mundo perfecto ni maravillas imposibles. Me hace feliz pensar en caminar contigo, escuchar lo que llevas dentro y seguir compartiendo historias, lugares y días.

Gracias por abrirme un poquito más tu corazón. Quiero cuidar lo que somos y seguir descubriendo contigo lo que podemos llegar a ser.

De todas las maravillas, mi favorita es encontrarte en mi vida.

Con amor,
David 💛`;

  constructor() {
    afterNextRender(() => {
      this.clave = this.route.snapshot.queryParamMap.get('clave') || '';
      this.invitacionValida.set(/^[a-f0-9]{64}$/.test(this.clave));
      this.restaurar();
      void this.crearMotor();
      if (this.finalizado() && ['sin_enviar','pendiente'].includes(this.correo())) this.enviarRespuestas();
    });
    this.destroyRef.onDestroy(() => {
      if (this.sondeo) clearTimeout(this.sondeo);
      this.motor?.destruir();
    });
  }

  private async crearMotor(): Promise<void> {
    try {
      const { Mundo3D } = await import('./mundo3d');
      if (this.destroyRef.destroyed) return;
      this.zone.runOutsideAngular(() => {
        this.motor = new Mundo3D(this.escenario.nativeElement,
          cerca => this.zone.run(() => this.cerca.set(cerca)),
          () => this.zone.run(() => this.abrirReto()),
          () => this.zone.run(() => this.error3d.set('El dispositivo perdió la conexión con el escenario 3D. Puedes continuar en modo lectura.')));
        this.motor.cambiarLugar(this.actual().id, this.actualRecogido());
        this.motor.pausar(!this.iniciado() || this.finalizado());
      });
    } catch {
      this.motor?.destruir(); this.motor = undefined;
      this.error3d.set('No se pudo iniciar el escenario 3D. Puedes continuar la historia en modo lectura.');
    } finally {
      if (!this.destroyRef.destroyed) this.cargando3d.set(false);
    }
  }

  comenzar(): void {
    this.iniciado.set(true);
    this.motor?.pausar(this.finalizado());
    this.motor?.enfocar();
  }

  continuarSin3d(): void {
    this.motor?.destruir(); this.motor = undefined;
    this.sin3d.set(true); this.cerca.set(true); this.iniciado.set(true);
  }

  enfocarJuego(): void { if (this.iniciado()) this.motor?.enfocar(); }

  mover(event: PointerEvent, x: number, z: number): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.motor?.moverTactil(x,z);
  }

  detener(): void { this.motor?.moverTactil(0,0); }

  abrirReto(): void {
    if (this.actualRecogido() || (!this.cerca() && !this.sin3d()) || this.finalizado()) return;
    this.borrador.set(this.respuestas()[this.actual().campo]);
    this.errorRespuesta.set('');
    this.motor?.pausar(true);
    this.dialogo.nativeElement.showModal();
  }

  cerrarReto(event?: Event): void {
    event?.preventDefault();
    if (this.validando()) return;
    this.dialogo.nativeElement.close();
    this.motor?.pausar(false);
    this.motor?.enfocar();
  }

  editar(texto: string): void {
    this.borrador.set(texto);
    this.respuestas.update(r => ({ ...r, [this.actual().campo]: texto }));
    this.errorRespuesta.set('');
    this.persistir();
  }

  confirmarRespuesta(): void {
    if (this.validando() || this.actualRecogido()) return;
    const texto = this.borrador().trim();
    const max = this.actual().id === 'libreria' ? 200 : 2000;
    if (!texto || texto.length > max) {
      this.errorRespuesta.set(`Escribe entre 1 y ${max} caracteres, a tu manera 💛`); return;
    }
    if (this.actual().id !== 'libreria') { this.recoger(texto); return; }
    if (!this.invitacionValida()) { this.errorRespuesta.set('Abre el juego desde el enlace de tu invitación.'); return; }
    this.validando.set(true);
    this.http.post<RespuestaAPI>(`${this.api}/api/puzzle3/validar-libro`, { clave: this.clave, libro: texto })
      .pipe(timeout(15000), takeUntilDestroyed(this.destroyRef), finalize(() => this.validando.set(false)))
      .subscribe({
        next: r => { if (r.ok) this.recoger(texto); else this.errorRespuesta.set(r.mensaje || 'No se pudo validar el título.'); },
        error: e => this.errorRespuesta.set(this.mensajeError(e, 'No pude consultar el libro. Revisa tu conexión e inténtalo otra vez.'))
      });
  }

  private recoger(texto: string): void {
    const lugar = this.actual();
    this.respuestas.update(r => ({ ...r, [lugar.campo]: texto }));
    this.recogidos.update(r => [...new Set([...r,lugar.id])]);
    this.motor?.recoger();
    this.dialogo.nativeElement.close();
    this.motor?.pausar(this.finalizado());
    this.persistir();
    if (this.finalizado()) this.enviarRespuestas();
    else this.motor?.enfocar();
  }

  siguienteLugar(): void {
    if (!this.actualRecogido() || this.indice() >= 2) return;
    this.indice.update(i => i + 1);
    this.cerca.set(this.sin3d()); this.pistaVisible.set(false);
    this.motor?.cambiarLugar(this.actual().id, this.actualRecogido());
    this.motor?.pausar(false);
    this.motor?.enfocar(); this.persistir();
  }

  enviarRespuestas(): void {
    if (!this.finalizado() || this.comprobandoEnvio() || this.correo() === 'enviado' || this.correo() === 'sin_confirmar') return;
    if (!this.invitacionValida()) { this.errorEnvio.set('Abre el juego desde el enlace de tu invitación para enviar tus respuestas.'); return; }
    this.errorEnvio.set(''); this.comprobandoEnvio.set(true); this.inicioEnvio = Date.now();
    this.consultarEnvio();
  }

  private consultarEnvio(): void {
    this.http.post<RespuestaAPI>(`${this.api}/api/puzzle3/completar`, {
      id: this.partidaId, clave: this.clave, ...this.respuestas()
    }).pipe(timeout(15000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: r => {
          if (!r.ok || !r.correo) {
            this.comprobandoEnvio.set(false); this.errorEnvio.set(r.mensaje || 'No se pudo registrar la aventura.'); return;
          }
          this.correo.set(r.correo); this.guardadoServidor.set(r.guardado === true); this.persistir();
          if (r.correo === 'pendiente' && Date.now() - this.inicioEnvio < 60000) {
            this.sondeo = setTimeout(() => this.consultarEnvio(), 3000);
          } else {
            this.comprobandoEnvio.set(false);
            if (r.correo === 'pendiente') this.errorEnvio.set('El envío sigue en proceso. Puedes volver a consultar su estado.');
          }
        },
        error: e => {
          this.comprobandoEnvio.set(false);
          this.errorEnvio.set(this.mensajeError(e, 'No se pudo confirmar el envío. Tus respuestas siguen aquí; vuelve a intentarlo.'));
        }
      });
  }

  guardarCarta(): void {
    if (!this.finalizado() || this.cartaGuardada()) return;
    try {
      this.amorcito.guardarCarta({ id: 3, titulo: this.tituloCarta, contenido: this.textoCarta,
        fechaGuardado: new Date().toISOString(), descargable: true });
      this.amorcito.marcarPuzzleCompletado(3);
      this.cartaGuardada.set(true); this.errorCarta.set('');
    } catch { this.errorCarta.set('No se pudo guardar la carta en este navegador. Inténtalo nuevamente.'); }
  }

  private mensajeError(error: unknown, alternativa: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.mensaje === 'string') return error.error.mensaje;
    return alternativa;
  }

  private nuevoId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('');
  }

  private persistir(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({ id: this.partidaId, indice: this.indice(),
        respuestas: this.respuestas(), recogidos: this.recogidos(), correo: this.correo(), guardadoServidor: this.guardadoServidor() }));
      this.avisoLocal.set('');
    } catch { this.avisoLocal.set('El navegador no pudo guardar el avance. Mantén esta página abierta hasta terminar.'); }
  }

  private restaurar(): void {
    this.partidaId = this.nuevoId();
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (data && typeof data.id === 'string' && /^[a-f0-9]{32}$/.test(data.id)) {
        this.partidaId = data.id;
        const r = data.respuestas;
        if (r && ['parque','mirador','libro'].every(k => typeof r[k] === 'string')) {
          this.respuestas.set({ parque: r.parque.slice(0,2000), mirador: r.mirador.slice(0,2000), libro: r.libro.slice(0,200) });
          // Solo restaura un prefijo consecutivo de lugares con respuesta.
          const recogidos: Lugar[] = [];
          for (const lugar of this.lugares) {
            if (!Array.isArray(data.recogidos) || !data.recogidos.includes(lugar.id) || !this.respuestas()[lugar.campo].trim()) break;
            recogidos.push(lugar.id);
          }
          this.recogidos.set(recogidos);
          const indice = Number.isInteger(data.indice) ? data.indice : 0;
          this.indice.set(Math.max(0,Math.min(indice,recogidos.length,2)));
        }
        if (['sin_enviar','pendiente','enviado','sin_confirmar'].includes(data.correo) && this.finalizado()) this.correo.set(data.correo);
        this.guardadoServidor.set(data.guardadoServidor === true && this.finalizado());
      }
    } catch { this.avisoLocal.set('No se pudo recuperar el avance anterior.'); }
    try {
      this.cartaGuardada.set(this.amorcito.obtenerCartas().some(c => c.id === 3)
        && this.amorcito.obtenerProgreso().puzzlesCompletados.includes(3));
    } catch { /* El juego sigue disponible aunque fallen las cartas anteriores. */ }
    this.persistir();
  }
}
