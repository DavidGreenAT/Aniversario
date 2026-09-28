import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';

import { AmorcitoService } from '../services/amorcito-service';

type FragmentoId = 'recuerdo' | 'sueno' | 'cuidado';

type EstadoCorreo =
  | 'sin_enviar'
  | 'pendiente'
  | 'enviado'
  | 'sin_confirmar';

interface Fragmento {
  id: FragmentoId;
  titulo: string;
  objeto: string;
  simbolo: string;
  pregunta: string;
  mensaje: string;
  imagen: string;
}

interface RespuestaAPI {
  ok: boolean;
  guardado?: boolean;
  correo?: EstadoCorreo;
  mensaje?: string;
}

@Component({
  selector: 'app-puzzle4',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './puzzle4.html',
  styleUrl: './puzzle4.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Puzzle4 {
  @ViewChild('reto', { static: true })
  reto!: ElementRef<HTMLDialogElement>;

  @ViewChild('carta', { static: true })
  carta!: ElementRef<HTMLDialogElement>;

  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly amorcito = inject(AmorcitoService);
  private readonly destroyRef = inject(DestroyRef);

  // MISMA URL del backend que utilizas en Admin.
  private readonly api = 'https://TU-BACKEND.onrender.com';

  private readonly storageKey = 'amorcito_puzzle4_v1';

  private clave = '';
  private partidaId = '';
  private consulta?: ReturnType<typeof setTimeout>;
  private inicioConsulta = 0;

  /*
   * IMAGEN FINAL
   * Después puedes poner, por ejemplo:
   * '/images/puzzle4/nuestro-hogar.jpg'
   *
   * Si usas public/, el archivo estaría en:
   * public/images/puzzle4/nuestro-hogar.jpg
   */
  readonly imagenFinal = '';

  readonly fragmentos: Fragmento[] = [
    {
      id: 'recuerdo',
      titulo: 'Lo que hemos vivido',
      objeto: 'Una fotografía',
      simbolo: '▧',
      pregunta: '¿Qué recuerdo de nosotros guardarías para siempre?',
      mensaje: 'Hay instantes que se convierten en un lugar al que siempre queremos volver.',

      // CAMBIAR DESPUÉS: '/images/puzzle4/fotografia.jpg'
      imagen: ''
    },
    {
      id: 'sueno',
      titulo: 'Lo que soñamos',
      objeto: 'Una ventana',
      simbolo: '✧',
      pregunta: '¿Qué sueño te gustaría que cumplamos juntos?',
      mensaje: 'Todavía hay paisajes que no conocemos y días que nos están esperando.',

      // CAMBIAR DESPUÉS: '/images/puzzle4/ventana.jpg'
      imagen: ''
    },
    {
      id: 'cuidado',
      titulo: 'Lo que queremos cuidar',
      objeto: 'Una luz',
      simbolo: '☼',
      pregunta: '¿Qué pequeña cosa de nuestra relación te gustaría que nunca perdiéramos?',
      mensaje: 'Lo que hacemos con cariño cada día también construye nuestra historia.',

      // CAMBIAR DESPUÉS: '/images/puzzle4/luz.jpg'
      imagen: ''
    }
  ];

  readonly respuestas = signal<Record<FragmentoId, string>>({
    recuerdo: '',
    sueno: '',
    cuidado: ''
  });

  readonly recogidos = signal<FragmentoId[]>([]);
  readonly activo = signal<Fragmento | null>(null);
  readonly borrador = signal('');
  readonly errorRespuesta = signal('');
  readonly aviso = signal('');

  readonly puertaAbierta = signal(false);
  readonly cartaGuardada = signal(false);
  readonly errorCarta = signal('');

  readonly correo = signal<EstadoCorreo>('sin_enviar');
  readonly comprobando = signal(false);
  readonly guardadoServidor = signal(false);
  readonly errorEnvio = signal('');

  readonly llaveCompleta = computed(
    () => this.recogidos().length === 3
  );

  readonly tituloCarta = 'Mi próximo capítulo, contigo';

  readonly textoCarta = `Mi Ariana:

Feliz aniversario, amorcito.

Preparé esta aventura para regalarte un poquito de lo que siento por ti. En cada puerta, en cada lugar y en cada palabra había una manera de decirte cuánto significa para mí que estés en mi vida.

Recordamos nuestro comienzo, recorrimos algunos sueños y llegamos hasta aquí. Y ahora que termina el juego, quiero decirte algo sin pistas ni acertijos:

Quiero compartir mi vida contigo.

Quiero conocerte también en las versiones de ti que todavía no existen. Escuchar los sueños que vayas descubriendo, acompañarte cuando algo te cueste y celebrar contigo esas pequeñas alegrías que a veces solo entiende quien te conoce de cerca.

Me ilusiona pensar en una vida con nuestros detalles: preparar algo de comer, prestarnos un libro, salir a caminar, contarnos cómo nos fue y encontrar tiempo para nosotros aun en los días ocupados.

Sé que habrá cosas que tendremos que aprender. No puedo prometerte que siempre sabré qué decir o que nunca voy a equivocarme. Mi promesa es escucharte, hablarte con honestidad, reconocer mis errores y poner de mi parte para cuidar lo que estamos construyendo.

Ese es el futuro que me gustaría construir contigo, paso a paso, con los sueños y las decisiones de los dos.

Gracias por todo lo que hemos vivido y por dejarme compartir contigo este aniversario. Cuando pienso en los capítulos que vienen, me hace feliz imaginarte en ellos.

La aventura termina aquí. Mis ganas de vivir cosas contigo siguen.

Te amo, Ariana. Feliz aniversario. 💛

Con amor,
David`;

  constructor() {
    afterNextRender(() => {
      this.clave =
        this.route.snapshot.queryParamMap.get('clave') || '';

      this.restaurar();

      if (this.puertaAbierta()) {
        this.abrirCarta();

        if (
          this.correo() === 'sin_enviar' ||
          this.correo() === 'pendiente'
        ) {
          this.enviarRespuestas();
        }
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.consulta) {
        clearTimeout(this.consulta);
      }
    });
  }

  abrirFragmento(fragmento: Fragmento): void {
    if (
      this.puertaAbierta() ||
      this.recogidos().includes(fragmento.id)
    ) {
      return;
    }

    this.activo.set(fragmento);
    this.borrador.set(this.respuestas()[fragmento.id]);
    this.errorRespuesta.set('');
    this.reto.nativeElement.showModal();
  }

  editar(texto: string): void {
    this.borrador.set(texto);
    this.errorRespuesta.set('');

    const fragmento = this.activo();

    if (fragmento) {
      this.respuestas.update(actuales => ({
        ...actuales,
        [fragmento.id]: texto
      }));

      this.persistir();
    }
  }

  cerrarReto(event?: Event): void {
    event?.preventDefault();
    this.reto.nativeElement.close();
  }

  guardarRespuesta(): void {
    const fragmento = this.activo();
    const texto = this.borrador().trim();

    if (!fragmento) {
      return;
    }

    if (!texto || texto.length > 2000) {
      this.errorRespuesta.set(
        'Escribe entre 1 y 2,000 caracteres, a tu manera 💛'
      );
      return;
    }

    this.respuestas.update(actuales => ({
      ...actuales,
      [fragmento.id]: texto
    }));

    this.recogidos.update(actuales => [
      ...new Set([...actuales, fragmento.id])
    ]);

    this.persistir();
    this.cerrarReto();
  }

  abrirPuerta(): void {
    if (!this.llaveCompleta()) {
      return;
    }

    this.puertaAbierta.set(true);
    this.persistir();

    this.abrirCarta();
    this.enviarRespuestas();
  }

  abrirCarta(): void {
    if (!this.puertaAbierta()) {
      return;
    }

    if (!this.carta.nativeElement.open) {
      this.carta.nativeElement.showModal();
    }
  }

  cerrarCarta(event?: Event): void {
    event?.preventDefault();
    this.carta.nativeElement.close();
  }

  guardarCarta(): void {
    if (!this.puertaAbierta() || this.cartaGuardada()) {
      return;
    }

    try {
      this.amorcito.guardarCarta({
        id: 4,
        titulo: this.tituloCarta,
        contenido: this.textoCarta,
        fechaGuardado: new Date().toISOString(),
        descargable: true
      });

      this.amorcito.marcarPuzzleCompletado(4);

      this.cartaGuardada.set(true);
      this.errorCarta.set('');
    } catch {
      this.errorCarta.set(
        'No pude guardar la carta. Puedes intentarlo otra vez.'
      );
    }
  }

  enviarRespuestas(): void {
    if (
      !this.puertaAbierta() ||
      this.comprobando() ||
      this.correo() === 'enviado' ||
      this.correo() === 'sin_confirmar'
    ) {
      return;
    }

    if (!/^[a-f0-9]{64}$/.test(this.clave)) {
      this.errorEnvio.set(
        'Para enviar tus respuestas, abre el Puzzle 4 desde su invitación. Tu carta sigue disponible.'
      );
      return;
    }

    this.errorEnvio.set('');
    this.comprobando.set(true);
    this.inicioConsulta = Date.now();

    this.consultarEnvio();
  }

  private consultarEnvio(): void {
    this.http.post<RespuestaAPI>(
      `${this.api}/api/puzzle4/completar`,
      {
        id: this.partidaId,
        clave: this.clave,
        ...this.respuestas()
      }
    ).pipe(
      timeout(15000),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: resultado => {
        if (!resultado.ok || !resultado.correo) {
          this.comprobando.set(false);
          this.errorEnvio.set(
            resultado.mensaje || 'No pude confirmar el envío.'
          );
          return;
        }

        this.correo.set(resultado.correo);
        this.guardadoServidor.set(resultado.guardado === true);
        this.persistir();

        if (
          resultado.correo === 'pendiente' &&
          Date.now() - this.inicioConsulta < 60000
        ) {
          this.consulta = setTimeout(
            () => this.consultarEnvio(),
            3000
          );
          return;
        }

        this.comprobando.set(false);

        if (resultado.correo === 'pendiente') {
          this.errorEnvio.set(
            'El correo sigue en proceso. Puedes consultar otra vez.'
          );
        }
      },
      error: (error: unknown) => {
        this.comprobando.set(false);

        const mensaje =
          error instanceof HttpErrorResponse &&
          typeof error.error?.mensaje === 'string'
            ? error.error.mensaje
            : 'No pude conectar con el servidor. Tu carta y tus respuestas siguen aquí.';

        this.errorEnvio.set(mensaje);
      }
    });
  }

  private persistir(): void {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          id: this.partidaId,
          respuestas: this.respuestas(),
          recogidos: this.recogidos(),
          puertaAbierta: this.puertaAbierta(),
          correo: this.correo(),
          guardadoServidor: this.guardadoServidor()
        })
      );

      this.aviso.set('');
    } catch {
      this.aviso.set(
        'El navegador no pudo guardar tu avance.'
      );
    }
  }

  private restaurar(): void {
    this.partidaId = Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      valor => valor.toString(16).padStart(2, '0')
    ).join('');

    try {
      const datos = JSON.parse(
        localStorage.getItem(this.storageKey) || 'null'
      );

      if (
        datos &&
        typeof datos.id === 'string' &&
        /^[a-f0-9]{32}$/.test(datos.id)
      ) {
        this.partidaId = datos.id;

        const respuestas = {
          recuerdo: '',
          sueno: '',
          cuidado: ''
        };

        for (const fragmento of this.fragmentos) {
          const valor = datos.respuestas?.[fragmento.id];

          if (typeof valor === 'string') {
            respuestas[fragmento.id] = valor.slice(0, 2000);
          }
        }

        this.respuestas.set(respuestas);

        this.recogidos.set(
          this.fragmentos
            .filter(fragmento =>
              Array.isArray(datos.recogidos) &&
              datos.recogidos.includes(fragmento.id) &&
              respuestas[fragmento.id].trim().length > 0
            )
            .map(fragmento => fragmento.id)
        );

        this.puertaAbierta.set(
          datos.puertaAbierta === true &&
          this.llaveCompleta()
        );

        if (
          this.puertaAbierta() &&
          ['sin_enviar', 'pendiente', 'enviado', 'sin_confirmar']
            .includes(datos.correo)
        ) {
          this.correo.set(datos.correo);
          this.guardadoServidor.set(
            datos.guardadoServidor === true
          );
        }
      }
    } catch {
      this.aviso.set(
        'No pude recuperar el avance anterior.'
      );
    }

    try {
      this.cartaGuardada.set(
        this.amorcito.obtenerCartas()
          .some(carta => carta.id === 4) &&
        this.amorcito.obtenerProgreso()
          .puzzlesCompletados.includes(4)
      );
    } catch {
      this.errorCarta.set(
        'No pude consultar las cartas guardadas.'
      );
    }
  }
}
