import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { Router } from '@angular/router';

import {
  AmorcitoService
} from '../services/amorcito-service';


interface CartaJuego {
  id: number;
  pareja: number;
  imagen: string;
  volteada: boolean;
  encontrada: boolean;
}


@Component({
  selector: 'app-puzzle1',
  imports: [],
  templateUrl: './puzzle1.html',
  styleUrl: './puzzle1.css'
})
export class Puzzle1 implements OnInit {

  private router =
    inject(Router);

  private amorcitoService =
    inject(AmorcitoService);

  private cdr =
    inject(ChangeDetectorRef);


  /*
   * =====================================================
   * MEMORAMA
   * =====================================================
   */

  cartas: CartaJuego[] = [];

  primeraCarta:
    CartaJuego | null = null;

  segundaCarta:
    CartaJuego | null = null;

  bloqueado = false;

  intentos = 0;

  parejasEncontradas = 0;

  completado = false;


  /*
   * =====================================================
   * CARTA FINAL
   * =====================================================
   */

  mostrarCartaPopup = false;

  cartaAbierta = false;


  cartaTitulo =
    'Para ti, amorcito 💛';


  cartaContenido = `
Mi amor:

Si estás leyendo esto, significa que lograste completar la primera prueba… y no sabes la sonrisa que tengo al imaginarte llegando hasta aquí.

Tal vez para ti solo sea una pequeña parte de este juego, pero para mí significa mucho más. Cada pista, cada detalle y cada momento que encuentres en el camino fueron pensados especialmente para ti, porque quería encontrar una forma diferente de recordarte lo importante que eres para mí.

Desde que llegaste a mi vida, has convertido momentos que parecían simples en recuerdos que quiero guardar para siempre. Hay instantes contigo que quizá para el mundo no significan nada, pero que para mí lo significan todo.

Y si algo he aprendido durante todo este tiempo, es que no necesito una ocasión especial para saber cuánto te amo. Me basta con pensar en ti, recordar tu sonrisa, escuchar tu voz o simplemente imaginar todos los momentos que todavía nos quedan por vivir.

Por eso, quiero que disfrutes cada parte de este pequeño juego. No tengas prisa. Déjate sorprender, disfruta cada pista y, sobre todo, recuerda que detrás de cada una hay un pedacito de todo lo que siento por ti.

Porque esto apenas comienza…

Y si esta primera ya te gusto, espero que las siguientes logren hacerte sentir aunque sea una pequeña parte de todo el amor que tengo por ti.

Te amo más de lo que mis palabras podrían explicar.

Con todo mi corazón,

David ♡

  `.trim();


  /*
   * =====================================================
   * INICIALIZACIÓN
   * =====================================================
   */

  ngOnInit(): void {
    this.iniciarJuego();
  }


  /*
   * =====================================================
   * INICIAR JUEGO
   * =====================================================
   */

  iniciarJuego(): void {

    this.intentos = 0;

    this.parejasEncontradas = 0;

    this.primeraCarta = null;

    this.segundaCarta = null;

    this.bloqueado = false;

    this.completado = false;

    this.mostrarCartaPopup = false;

    this.cartaAbierta = false;


    const imagenes = [
      '/img/1.jpeg',
      '/img/2.jpeg',
      '/img/3.jpeg',
      '/img/4.jpeg',
      '/img/5.jpeg',
      '/img/6.jpeg'
    ];


    const nuevasCartas:
      CartaJuego[] = [];

    let id = 1;


    imagenes.forEach(
      (imagen, index) => {

        nuevasCartas.push({
          id: id++,
          pareja: index + 1,
          imagen,
          volteada: false,
          encontrada: false
        });


        nuevasCartas.push({
          id: id++,
          pareja: index + 1,
          imagen,
          volteada: false,
          encontrada: false
        });

      }
    );


    this.cartas =
      this.mezclarCartas(
        nuevasCartas
      );


    this.cdr.detectChanges();
  }


  /*
   * =====================================================
   * MEZCLAR
   * =====================================================
   */

  private mezclarCartas(
    cartas: CartaJuego[]
  ): CartaJuego[] {

    const copia =
      [...cartas];


    for (
      let i = copia.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );


      [
        copia[i],
        copia[j]
      ] = [
        copia[j],
        copia[i]
      ];

    }


    return copia;
  }


  /*
   * =====================================================
   * SELECCIONAR CARTA
   * =====================================================
   */

  seleccionarCarta(
    carta: CartaJuego
  ): void {

    console.log(
      '🃏 Carta seleccionada:',
      carta.id,
      carta.pareja
    );


    if (this.bloqueado) {
      return;
    }


    if (
      carta.volteada ||
      carta.encontrada
    ) {
      return;
    }


    /*
     * Mostrar inmediatamente
     */

    carta.volteada = true;


    /*
     * Forzar actualización visual
     */

    this.cdr.detectChanges();


    /*
     * PRIMERA CARTA
     */

    if (!this.primeraCarta) {

      this.primeraCarta =
        carta;

      console.log(
        '1️⃣ Primera carta:',
        carta.pareja
      );

      return;
    }


    /*
     * SEGUNDA CARTA
     */

    this.segundaCarta =
      carta;


    console.log(
      '2️⃣ Segunda carta:',
      carta.pareja
    );


    this.intentos++;


    /*
     * Bloqueamos inmediatamente para
     * impedir una tercera selección
     */

    this.bloqueado = true;


    this.cdr.detectChanges();


    this.comprobarPareja();
  }


  /*
   * =====================================================
   * COMPROBAR PAREJA
   * =====================================================
   */

  comprobarPareja(): void {

    if (
      !this.primeraCarta ||
      !this.segundaCarta
    ) {
      return;
    }


    const primera =
      this.primeraCarta;

    const segunda =
      this.segundaCarta;


    /*
     * ===================================================
     * SON IGUALES
     * ===================================================
     */

    if (
      primera.pareja ===
      segunda.pareja
    ) {

      console.log(
        '💛 ¡Pareja encontrada!'
      );


      /*
       * Dejamos una pequeña pausa
       * para que pueda verse el giro.
       */

      setTimeout(
        () => {

          primera.encontrada =
            true;

          segunda.encontrada =
            true;


          this.parejasEncontradas++;


          console.log(
            `✅ Parejas: ${this.parejasEncontradas}/6`
          );


          this.reiniciarSeleccion();


          /*
           * TERMINÓ EL JUEGO
           */

          if (
            this.parejasEncontradas === 6
          ) {

            console.log(
              '🎉 PUZZLE COMPLETADO'
            );


            setTimeout(
              () => {

                this.completado =
                  true;

                this.cdr
                  .detectChanges();

              },
              500
            );

          }


          this.cdr
            .detectChanges();

        },
        350
      );


      return;
    }


    /*
     * ===================================================
     * NO SON IGUALES
     * ===================================================
     */

    console.log(
      '❌ No son pareja'
    );


    setTimeout(
      () => {

        primera.volteada =
          false;

        segunda.volteada =
          false;


        this.reiniciarSeleccion();


        this.cdr
          .detectChanges();

      },
      1000
    );
  }


  /*
   * =====================================================
   * LIMPIAR SELECCIÓN
   * =====================================================
   */

  reiniciarSeleccion(): void {

    this.primeraCarta =
      null;

    this.segundaCarta =
      null;

    this.bloqueado =
      false;

  }


  /*
   * =====================================================
   * VOLVER A JUGAR
   * =====================================================
   */

  volverAJugar(): void {

    this.iniciarJuego();

  }


  /*
   * =====================================================
   * CONTINUAR
   * =====================================================
   */

  continuarPuzzle(): void {

    console.log(
      '💌 Abriendo carta...'
    );


    this.completado =
      false;


    this.cdr
      .detectChanges();


    setTimeout(
      () => {

        this.mostrarCartaPopup =
          true;


        this.cdr
          .detectChanges();

      },
      300
    );
  }


  /*
   * =====================================================
   * ABRIR CARTA
   * =====================================================
   */

  abrirCarta(): void {

    this.cartaAbierta =
      true;


    this.cdr
      .detectChanges();

  }


  /*
   * =====================================================
   * GUARDAR CARTA
   * =====================================================
   */

  guardarCarta(): void {

    console.log(
      '💾 Guardando carta...'
    );


    this.amorcitoService
      .guardarCarta({

        id: 1,

        titulo:
          this.cartaTitulo,

        contenido:
          this.cartaContenido,

        fechaGuardado:
          new Date()
            .toISOString(),

        descargable: true

      });


    this.amorcitoService
      .marcarPuzzleCompletado(
        1
      );


    this.mostrarCartaPopup =
      false;

    this.cartaAbierta =
      false;


    console.log(
      '✅ Carta guardada'
    );

    console.log(
      '➡️ Redirigiendo a /amorcito'
    );


    this.router.navigate([
      '/amorcito'
    ]);
  }

}
