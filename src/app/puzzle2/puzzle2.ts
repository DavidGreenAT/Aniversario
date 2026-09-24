import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  AmorcitoService
} from '../services/amorcito-service';

interface Puerta {
  id: number;
  titulo: string;
  pregunta: string;
  respuestas: string[];
  pista: string;
  mensaje: string;
  color: string;
}

@Component({
  selector: 'app-puzzle2',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './puzzle2.html',
  styleUrl: './puzzle2.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Puzzle2 {

  private readonly amorcitoService =
    inject(AmorcitoService);

  private readonly progresoKey =
    'amorcito_puzzle2_puertas';

  private readonly cartaId = 2

  readonly puertas: Puerta[] = [
    {
      id: 1,
      titulo: 'El comienzo',
      pregunta: '¿Dónde fue nuestra primera cita?',
      respuestas: ['CAMBIAR_1'],
      pista: 'Recuerda ese lugar donde comenzó nuestra aventura.',
      mensaje: 'Si pudiera volver al principio, volvería a elegir encontrarte.',
      color: '#005cbf'
    },
    {
      id: 2,
      titulo: 'Nuestra melodía',
      pregunta: '¿Qué canción nos recuerda a nosotros?',
      respuestas: ['CAMBIAR_2'],
      pista: 'Esa canción que te hace pensar en mí cuando la escuchas.',
      mensaje: 'Desde que estás tú, hay canciones que tienen otro significado.',
      color: '#652f5f'
    },
    {
      id: 3,
      titulo: 'Un nombre especial',
      pregunta: '¿Cuál es ese apodo de cariño que te digo?',
      respuestas: ['CAMBIAR_3'],
      pista: 'No es tu nombre, pero sabes perfectamente que te hablo a ti.',
      mensaje: 'Entre tantas palabras, siempre encuentro una forma bonita de llamarte.',
      color: '#2b1b60'
    },
    {
      id: 4,
      titulo: 'Nuestra fecha',
      pregunta: '¿Qué día comenzó nuestra historia? Escríbelo como día/mes/año.',
      respuestas: ['CAMBIAR_4'],
      pista: 'Es esa fecha que convirtió un día cualquiera en uno especial.',
      mensaje: 'Hay fechas que se escriben en el calendario y otras que se quedan en el corazón.',
      color: '#23646a'
    },
    {
      id: 5,
      titulo: 'Un lugar pendiente',
      pregunta: '¿A qué lugar queremos ir juntos?',
      respuestas: ['CAMBIAR_5'],
      pista: 'Piensa en ese plan del que hemos hablado.',
      mensaje: 'Todavía nos esperan muchos lugares, pero mi parte favorita será ir contigo.',
      color: '#854c25'
    },
    {
      id: 6,
      titulo: 'El primer detalle',
      pregunta: '¿Cuál fue el primer regalo que te di?',
      respuestas: ['CAMBIAR_6'],
      pista: 'Recuerda ese primer detalle y lo que sentiste al recibirlo.',
      mensaje: 'Lo más bonito de darte algo siempre será verte sonreír.',
      color: '#536229'
    }
  ];

  readonly tituloCarta =
    'Seis puertas y una misma elección: tú';

  readonly textoCarta = `Mi Ariana:

Hoy abriste seis puertas.

Y detrás de cada una encontraste un pequeño pedacito de nuestra historia: un comienzo, una canción, una palabra, una fecha, un sueño y un detalle. Cosas que, por separado, quizá parezcan pequeñas… pero que juntas cuentan una historia que para mí significa muchísimo.

Me gusta pensar que así es como se construye el amor: no solamente con los grandes momentos, sino también con esas pequeñas cosas que, sin darnos cuenta, terminan convirtiéndose en nuestros recuerdos favoritos.

Cada risa, cada conversación, cada abrazo, cada momento inesperado y cada instante que hemos compartido ha ido dejando una pequeña huella en mí. Y quizá eso es lo más bonito de todo: que nuestra historia no está hecha solamente de un día especial, sino de todos esos momentos que hemos ido convirtiendo en algo nuestro.

Gracias por compartir conmigo tus días, por dejarme conocer tu mundo, por las risas, por los momentos difíciles, por las conversaciones que se alargan y por todas esas pequeñas cosas que quizá no siempre te digo, pero que valoro muchísimo.

Me hace feliz mirar hacia atrás y recordar todo lo que hemos vivido, pero todavía me emociona más mirar hacia adelante e imaginar todo lo que nos falta por vivir.

Porque hoy terminaste seis puertas… pero nuestra historia todavía tiene muchas más por abrir.

Y si pudiera regresar al principio, si tuviera la oportunidad de volver a vivir cada momento desde cero, volvería a elegirte. Volvería a recorrer cada camino, incluso sin saber dónde termina, si al final de él estás tú.

Porque entre tantas personas, tantos caminos y tantos momentos posibles, mi parte favorita de esta historia siempre será haber encontrado el camino que me llevó hasta ti.

Y ahora que llegaste hasta aquí, quiero que recuerdes algo:

Esto no era solamente un juego.

Era mi manera de decirte, una vez más, cuánto significas para mí.

Te amo, Ariana.

Y espero que este sea solamente uno de los muchos capítulos que todavía nos quedan por escribir juntos.

Con todo mi amor,

David 💛
`;

  readonly resueltas =
    signal<number[]>([]);

  readonly seleccionada =
    signal<number | null>(null);

  readonly respuesta =
    signal('');

  readonly error =
    signal('');

  readonly pistaVisible =
    signal(false);

  readonly cartaAbierta =
    signal(false);

  readonly cartaGuardada =
    signal(false);

  readonly aviso =
    signal('');

  readonly puertaActiva = computed(
    () => this.puertas.find(
      puerta =>
        puerta.id === this.seleccionada()
    ) ?? null
  );

  readonly completado = computed(
    () =>
      this.resueltas().length ===
      this.puertas.length
  );

  readonly porcentaje = computed(
    () => Math.round(
      (
        this.resueltas().length /
        this.puertas.length
      ) * 100
    )
  );

  constructor() {
    this.restaurarEstado();
  }

  estaResuelta(id: number): boolean {
    return this.resueltas().includes(id);
  }

  seleccionarPuerta(puerta: Puerta): void {
    this.seleccionada.set(puerta.id);
    this.respuesta.set('');
    this.error.set('');
    this.pistaVisible.set(false);
  }

  actualizarRespuesta(valor: string): void {
    this.respuesta.set(valor);
    this.error.set('');
  }

  mostrarPista(): void {
    this.pistaVisible.update(
      visible => !visible
    );
  }

  comprobarRespuesta(): void {
    const puerta = this.puertaActiva();

    if (
      !puerta ||
      this.estaResuelta(puerta.id)
    ) {
      return;
    }

    const respuesta =
      this.normalizar(this.respuesta());

    if (!respuesta) {
      this.error.set(
        'Escribe tu respuesta, amorcito 💛'
      );

      return;
    }

    const sinConfigurar =
      puerta.respuestas.some(
        valor => valor.startsWith('CAMBIAR_')
      );

    if (sinConfigurar) {
      this.error.set(
        'David todavía debe configurar la respuesta de esta puerta.'
      );

      return;
    }

    const correcta =
      puerta.respuestas.some(
        valor =>
          this.normalizar(valor) ===
          respuesta
      );

    if (!correcta) {
      this.error.set(
        'Esta llave todavía no encaja. Intenta otra vez o pide una pista 💛'
      );

      return;
    }

    this.resueltas.update(
      actuales => [
        ...actuales,
        puerta.id
      ]
    );

    this.error.set('');
    this.pistaVisible.set(false);

    this.guardarAvance();
  }

  abrirCarta(): void {
    if (!this.completado()) {
      return;
    }

    this.cartaAbierta.set(true);
  }

  guardarCarta(): void {
    if (
      !this.completado() ||
      this.cartaGuardada()
    ) {
      return;
    }

    this.aviso.set('');

    try {
      /*
       * Estos son los campos visibles en tu
       * amorcito.ts y amorcito.html.
       *
       * Si CartaGuardada exige otros campos,
       * deben agregarse según models/carta.ts.
       */
      this.amorcitoService.guardarCarta({
        id: this.cartaId,
        titulo: this.tituloCarta,
        contenido: this.textoCarta,
        fechaGuardado: new Date().toISOString(),
        descargable: true
      });

      this.amorcitoService
        .marcarPuzzleCompletado(2);

      this.cartaGuardada.set(true);

    } catch (error) {
      console.error(
        'No se pudo guardar la carta del Puzzle 2:',
        error
      );

      this.aviso.set(
        'No pude guardar la carta y el progreso. Inténtalo nuevamente.'
      );
    }
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  private guardarAvance(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        this.progresoKey,
        JSON.stringify(this.resueltas())
      );

      this.aviso.set('');

    } catch {
      this.aviso.set(
        'Puedes seguir jugando, pero el navegador no pudo guardar tu avance.'
      );
    }
  }

  private restaurarEstado(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const guardado =
        window.localStorage.getItem(
          this.progresoKey
        );

      if (guardado) {
        const datos: unknown =
          JSON.parse(guardado);

        if (Array.isArray(datos)) {
          const idsValidos = datos.filter(
            (id: unknown): id is number =>
              typeof id === 'number' &&
              this.puertas.some(
                puerta => puerta.id === id
              )
          );

          this.resueltas.set(
            [...new Set(idsValidos)]
          );
        }
      }

    } catch {
      this.aviso.set(
        'No pude recuperar las puertas abiertas. Puedes resolverlas otra vez.'
      );
    }

    try {
      const cartas =
        this.amorcitoService
          .obtenerCartas();

      const progreso =
        this.amorcitoService
          .obtenerProgreso();

      const tieneCarta =
        cartas.some(
          carta =>
            carta.id === this.cartaId
        );

      const puzzleRegistrado =
        progreso
          .puzzlesCompletados
          .includes(2);

      /*
       * El servicio es la referencia para
       * saber si el guardado final terminó.
       */
      this.cartaGuardada.set(
        tieneCarta && puzzleRegistrado
      );

      if (tieneCarta || puzzleRegistrado) {
        this.resueltas.set(
          this.puertas.map(
            puerta => puerta.id
          )
        );
      }

    } catch {
      this.aviso.set(
        'No pude consultar tus cartas guardadas. El puzzle sigue disponible.'
      );
    }
  }
}
