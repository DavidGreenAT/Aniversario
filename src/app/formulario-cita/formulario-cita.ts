import { Component, inject, ChangeDetectorRef } from '@angular/core';
import {
  FormsModule,
  NgForm
} from '@angular/forms';
import { finalize } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Cita } from '../models/cita';

interface FechaDisponible {
  valor: string;
  titulo: string;
  hora: string;
}

type TipoToast = 'success' | 'error' | 'warning';

@Component({
  selector: 'app-formulario-cita',
  imports: [FormsModule],
  templateUrl: './formulario-cita.html',
  styleUrl: './formulario-cita.css',
})
export class FormularioCita {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  fechasDisponibles: FechaDisponible[] = [
    {
      valor: '2026-09-30T18:00',
      titulo: 'Miércoles 30 de septiembre',
      hora: '6:00 p.m.'
    },
    {
      valor: '2026-10-01T18:00',
      titulo: 'Jueves 1 de octubre',
      hora: '6:00 p.m.'
    },
    {
      valor: '2026-10-03T17:00',
      titulo: 'Sábado 3 de octubre',
      hora: '5:00 p.m.'
    }
  ];

  fechaSeleccionada = '';
  otraFecha = '';
  mensaje = '';

  enviando = false;
  enviado = false;
  intentoEnvio = false;

  fechaMinima = this.obtenerFechaMinima();

  toast = {
    visible: false,
    tipo: 'success' as TipoToast,
    titulo: '',
    mensaje: ''
  };

  private toastTimeout?: ReturnType<typeof setTimeout>;

  cita: Cita = {
    idCita: 0,
    name: '',
    fechaDate: new Date(),
    tipoVestimenta: '',
    comida: '',
    token: '',
    estatus: 'Pendiente',
    lugar: ''
  };

  get hayFechaSeleccionada(): boolean {
    return !!this.fechaSeleccionada || !!this.otraFecha;
  }

  alternarFecha(valor: string, event: Event): void {

    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {

      // Selecciona solamente esta fecha
      this.fechaSeleccionada = valor;

      // Elimina la fecha manual
      this.otraFecha = '';

    } else {

      // Permite quitar la selección
      if (this.fechaSeleccionada === valor) {
        this.fechaSeleccionada = '';
      }

    }

    this.enviado = false;
  }

  usarFechaManual(valor: string): void {

    this.otraFecha = valor;

    if (valor) {
      // Si pone una fecha manual,
      // quitamos automáticamente cualquier check.
      this.fechaSeleccionada = '';
    }

    this.enviado = false;
  }

  guardarCita(form: NgForm): void {

    this.intentoEnvio = true;

    /*
     * Validación del formulario
     */
    if (form.invalid) {

      this.mostrarToast(
        'warning',
        'Revisa el formulario',
        'Hay algunos campos que necesitan tu atención.'
      );

      return;
    }

    /*
     * Debe tener CHECK o FECHA MANUAL
     */
    if (!this.hayFechaSeleccionada) {

      this.mostrarToast(
        'warning',
        'Falta nuestra fecha 💛',
        'Elige una de las opciones o selecciona una fecha manual.'
      );

      return;
    }

    const fechaFinal =
      this.otraFecha || this.fechaSeleccionada;

    /*
     * Validación extra de fecha
     */
    const fechaElegida = new Date(fechaFinal);

    if (
      Number.isNaN(fechaElegida.getTime()) ||
      fechaElegida.getTime() < Date.now()
    ) {

      this.mostrarToast(
        'warning',
        'Fecha no válida',
        'La fecha debe ser posterior al momento actual.'
      );

      return;
    }

    const datos = {
      name: this.cita.name.trim(),
      fecha: fechaFinal,
      tipoVestimenta: this.cita.tipoVestimenta,
      comida: this.cita.comida.trim(),
      lugar: this.cita.lugar.trim(),
      mensaje: this.mensaje.trim()
    };

    this.enviando = true;
this.enviado = false;
this.cdr
  .detectChanges();

this.http
  .post<{
    ok: boolean;
    mensaje: string;
  }>(
    'https://aniversario-mb40.onrender.com/api/cita',
    datos
  )
  .pipe(

    finalize(
      () => {

        console.log(
          '🏁 Petición de cita terminada'
        );


        this.enviando =
          false;


        /*
         * Esto hará desaparecer
         * el spinner.
         */

        this.cdr
          .detectChanges();

      }
    )

  )
  .subscribe({

    next:
      respuesta => {

        console.log(
          '✅ Cita enviada:',
          respuesta
        );


        this.enviado =
          true;


        this.mostrarToast(
          'success',
          '¡Tu elección fue enviada! 💛',
          respuesta.mensaje ||
          'Ahora solo queda esperar un poquito...'
        );


        this.cdr
          .detectChanges();

      },


    error:
      error => {

        console.error(
          '❌ Error enviando cita:',
          error
        );


        this.enviado =
          false;


        const mensaje =
          error?.error?.mensaje ||
          'No pude enviar tu elección. Intenta nuevamente.';


        this.mostrarToast(
          'error',
          'Algo salió mal',
          mensaje
        );


        this.cdr
          .detectChanges();

      }

  });

  }

  mostrarToast(
  tipo: TipoToast,
  titulo: string,
  mensaje: string
): void {

  if (
    this.toastTimeout
  ) {

    clearTimeout(
      this.toastTimeout
    );

  }


  this.toast = {

    visible: true,

    tipo,

    titulo,

    mensaje

  };


  this.cdr
    .detectChanges();


  this.toastTimeout =
    setTimeout(
      () => {

        this.toast = {

          ...this.toast,

          visible: false

        };


        this.cdr
          .detectChanges();

      },
      5000
    );

}

  cerrarToast(): void {

  this.toast = {

    ...this.toast,

    visible: false

  };


  this.cdr
    .detectChanges();

}

  private obtenerFechaMinima(): string {

    const ahora = new Date();

    ahora.setMinutes(
      ahora.getMinutes() -
      ahora.getTimezoneOffset()
    );

    return ahora
      .toISOString()
      .slice(0, 16);
  }
}
