import { Injectable } from '@angular/core';
import { CartaGuardada } from '../models/carta';

@Injectable({
  providedIn: 'root'
})
export class AmorcitoService {

  private readonly CARTAS_KEY =
    'amorcito_cartas';

  private readonly PROGRESO_KEY =
    'amorcito_progreso';


  obtenerCartas(): CartaGuardada[] {

    const data =
      localStorage.getItem(
        this.CARTAS_KEY
      );

    return data
      ? JSON.parse(data)
      : [];
  }


  guardarCarta(
    carta: CartaGuardada
  ): void {

    const cartas =
      this.obtenerCartas();

    const yaExiste =
      cartas.some(
        item =>
          item.id === carta.id
      );

    if (!yaExiste) {
      cartas.push(carta);
    }

    localStorage.setItem(
      this.CARTAS_KEY,
      JSON.stringify(cartas)
    );
  }


  obtenerProgreso(): {
    puzzlesCompletados: number[];
  } {

    const data =
      localStorage.getItem(
        this.PROGRESO_KEY
      );

    return data
      ? JSON.parse(data)
      : {
          puzzlesCompletados: []
        };
  }


  marcarPuzzleCompletado(
    numero: number
  ): void {

    const progreso =
      this.obtenerProgreso();

    if (
      !progreso
        .puzzlesCompletados
        .includes(numero)
    ) {

      progreso
        .puzzlesCompletados
        .push(numero);
    }

    localStorage.setItem(
      this.PROGRESO_KEY,
      JSON.stringify(progreso)
    );
  }
}
