import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  finalize
} from 'rxjs';

import {
  CartaGuardada
} from '../models/carta';

import {
  AmorcitoService
} from '../services/amorcito-service';

import {
  CategoriaPrenda,
  OutfitHistorial,
  OutfitService
} from '../services/outfit-service';


interface CategoriaCloset {
  key: CategoriaPrenda;
  titulo: string;
  emoji: string;
  descripcion: string;
}


@Component({
  selector: 'app-amorcito',

  imports: [
    CommonModule
  ],

  templateUrl:
    './amorcito.html',

  styleUrl:
    './amorcito.css'
})
export class Amorcito
  implements OnInit {

  private cdr =
  inject(ChangeDetectorRef);

  private amorcitoService =
    inject(AmorcitoService);

  private outfitService =
    inject(OutfitService);



  /*
   * =========================================
   * PANEL
   * =========================================
   */

  cartas: CartaGuardada[] = [];

  puzzlesCompletados:
    number[] = [];

  diasRestantes = 0;

  progresoAniversario = 0;

  misOutfits:
  OutfitHistorial[] = [];

  cargandoMisOutfits =
    false;


  /*
   * =========================================
   * CLOSET
   * =========================================
   */

  categorias:
    CategoriaCloset[] = [

    {
      key: 'blusas',
      titulo: 'Blusas',
      emoji: '👚',
      descripcion:
        'Tops, blusas, camisas y suéteres.'
    },

    {
      key: 'pantalones',
      titulo: 'Parte inferior',
      emoji: '👖',
      descripcion:
        'Pantalones, faldas y shorts.'
    },

    {
      key: 'zapatos',
      titulo: 'Zapatos',
      emoji: '👟',
      descripcion:
        'Tus opciones de calzado.'
    },

    {
      key: 'accesorios',
      titulo: 'Accesorios',
      emoji: '👜',
      descripcion:
        'Bolsas, joyería y complementos.'
    }

  ];


  prendas:
    Record<
      CategoriaPrenda,
      File[]
    > = {

    blusas: [],
    pantalones: [],
    zapatos: [],
    accesorios: []

  };


  previews:
    Record<
      CategoriaPrenda,
      string[]
    > = {

    blusas: [],
    pantalones: [],
    zapatos: [],
    accesorios: []

  };


  outfits: string[] = [];

  generandoOutfits = false;

  errorOutfits = '';


  ngOnInit(): void {

    this.cartas =
      this.amorcitoService
        .obtenerCartas();


    this.puzzlesCompletados =
      this.amorcitoService
        .obtenerProgreso()
        .puzzlesCompletados;


    this.calcularAniversario();

    this.cargarMisOutfits();

  }


  /*
   * =========================================
   * NAVEGACIÓN
   * =========================================
   */

  irA(
    id: string
  ): void {

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
  }


  /*
   * =========================================
   * ANIVERSARIO
   * =========================================
   */

  calcularAniversario(): void {

    const ahora =
      new Date();

    const inicio =
      new Date(
        2026,
        8,
        24,
        0,
        0,
        0
      );

    const aniversario =
      new Date(
        2026,
        8,
        28,
        0,
        0,
        0
      );


    const unDia =
      1000 *
      60 *
      60 *
      24;


    const diferencia =
      aniversario.getTime() -
      ahora.getTime();


    this.diasRestantes =
      Math.max(
        0,
        Math.ceil(
          diferencia /
          unDia
        )
      );


    const duracion =
      aniversario.getTime() -
      inicio.getTime();


    const transcurrido =
      ahora.getTime() -
      inicio.getTime();


    this.progresoAniversario =
      Math.max(
        0,
        Math.min(
          100,
          (
            transcurrido /
            duracion
          ) * 100
        )
      );

  }

  /*
 * =========================================================
 * MIS OUTFITS
 * =========================================================
 */

cargarMisOutfits(): void {

  this.cargandoMisOutfits =
    true;


  this.outfitService
    .obtenerHistorial()
    .pipe(

      finalize(
        () => {

          this.cargandoMisOutfits =
            false;

          this.cdr
            .detectChanges();

        }
      )

    )
    .subscribe({

      next:
        respuesta => {

          this.misOutfits =
            respuesta.outfits ||
            [];


          console.log(
            '👗 Historial:',
            this.misOutfits.length
          );


          this.cdr
            .detectChanges();

        },


      error:
        error => {

          console.error(
            '❌ Error cargando historial:',
            error
          );


          this.cdr
            .detectChanges();

        }

    });

}

  /*
   * =========================================
   * CARTAS
   * =========================================
   */

  descargarCarta(
    carta: CartaGuardada
  ): void {

    const contenido =
      `${carta.titulo}\n\n${carta.contenido}`;


    const blob =
      new Blob(
        [contenido],
        {
          type:
            'text/plain;charset=utf-8'
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        'a'
      );


    link.href = url;

    link.download =
      `carta-${carta.id}.txt`;


    link.click();


    URL.revokeObjectURL(
      url
    );
  }


  /*
   * =========================================
   * PUZZLES
   * =========================================
   */

  puzzleCompletado(
    numero: number
  ): boolean {

    return this
      .puzzlesCompletados
      .includes(numero);
  }


  /*
   * =========================================
   * CLOSET
   * =========================================
   */

  seleccionarArchivos(
    event: Event,
    categoria:
      CategoriaPrenda
  ): void {

    const input =
      event.target as
        HTMLInputElement;


    const nuevos =
      Array.from(
        input.files || []
      );


    if (
      nuevos.length === 0
    ) {
      return;
    }


    /*
     * Máximo 6 por categoría
     */

    this.prendas[categoria] =
      [
        ...this
          .prendas[categoria],

        ...nuevos
      ].slice(0, 6);


    this.actualizarPreviews(
      categoria
    );


    input.value = '';

  }


  actualizarPreviews(
    categoria:
      CategoriaPrenda
  ): void {

    this.previews[categoria]
      .forEach(
        url =>
          URL.revokeObjectURL(
            url
          )
      );


    this.previews[categoria] =
      this.prendas[categoria]
        .map(
          archivo =>
            URL.createObjectURL(
              archivo
            )
        );
  }


  eliminarPrenda(
    categoria:
      CategoriaPrenda,

    index: number
  ): void {

    this.prendas[categoria]
      .splice(
        index,
        1
      );


    this.actualizarPreviews(
      categoria
    );


    this.outfits = [];
  }


  get totalPrendas(): number {

    return (
      this.prendas.blusas.length +
      this.prendas.pantalones.length +
      this.prendas.zapatos.length +
      this.prendas.accesorios.length
    );
  }


  generarOutfits(): void {

    if (
      this.totalPrendas < 2
    ) {

      this.errorOutfits =
        'Sube al menos dos prendas para comenzar 💛';

      this.cdr.detectChanges();

      return;
    }


    this.errorOutfits = '';

    this.outfits = [];

    this.generandoOutfits = true;

    this.cdr.detectChanges();


    console.log(
      '👗 Enviando prendas al backend...'
    );


    this.outfitService
      .generarOutfits(
        this.prendas
      )
      .pipe(

        finalize(
          () => {

            console.log(
              '🏁 Petición terminada'
            );


            this.generandoOutfits =
              false;


            /*
            * Forzar a Angular a
            * refrescar el HTML.
            */

            this.cdr.detectChanges();

          }
        )

      )
      .subscribe({

        next:
          respuesta => {

            console.log(
              '✅ Respuesta del backend:',
              respuesta
            );


            console.log(
              '🖼️ Imágenes recibidas:',
              respuesta.imagenes?.length
            );


            this.outfits =
              respuesta.imagenes || [];


            console.log(
              '📦 this.outfits:',
              this.outfits.length
            );

            this.cargarMisOutfits();

            /*
            * Actualizar vista inmediatamente
            */

            this.cdr.detectChanges();

          },


        error:
          error => {

            console.error(
              '❌ Error generando outfits:',
              error
            );


            this.errorOutfits =
              error
                ?.error
                ?.mensaje ||
              'No pude generar los outfits. Intenta nuevamente.';


            this.generandoOutfits =
              false;


            this.cdr.detectChanges();

          }

      });

  }

  guardarOutfitEnDispositivo(
  imagen: string
): void {

  try {

    /*
     * Extraemos el nombre del archivo
     * de la URL.
     */

    const url =
      new URL(
        imagen
      );


    const partes =
      url.pathname
        .split("/");


    const archivo =
      decodeURIComponent(
        partes[
          partes.length - 1
        ]
      );


    this.descargarOutfit(
      archivo
    );

  } catch (error) {

    console.error(
      '❌ URL del outfit inválida:',
      error
    );

  }

}

descargarOutfit(
  archivo: string
): void {

  const url =
    this.outfitService
      .obtenerUrlDescarga(
        archivo
      );


  /*
   * Creamos un enlace temporal.
   */

  const enlace =
    document.createElement(
      'a'
    );


  enlace.href =
    url;


  enlace.style.display =
    'none';


  document.body
    .appendChild(
      enlace
    );


  enlace.click();


  enlace.remove();

}


  regenerarOutfits(): void {

    this.outfits = [];

    this.cdr.detectChanges();

    this.generarOutfits();
  }

}
