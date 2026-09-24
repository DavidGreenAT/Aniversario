import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  claveAdmin = '';

  puzzleEnviando: number | null = null;

  asunto = '';
  mensaje = '';

  enviandoCorreo = false;

  notificacion = {
    visible: false,
    tipo: 'success',
    mensaje: ''
  };

  enviarPuzzle(numero: number): void {

    if (!this.claveAdmin.trim()) {

      this.mostrarMensaje(
        'error',
        'Ingresa tu clave administrativa.'
      );

      return;
    }


    this.puzzleEnviando =
      numero;

    this.cdr.detectChanges();


    const headers =
      new HttpHeaders({

        'X-Admin-Token':
          this.claveAdmin

      });


    this.http
      .post<{
        ok: boolean;
        mensaje: string;
      }>(
        'https://aniversario-mb40.onrender.com/api/admin/puzzle',
        {
          numero
        },
        {
          headers
        }
      )
      .pipe(

        finalize(
          () => {

            console.log(
              '🏁 Terminó petición puzzle'
            );


            this.puzzleEnviando =
              null;


            /*
            * IMPORTANTE
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
              '✅ Puzzle enviado:',
              respuesta
            );


            this.mostrarMensaje(
              'success',
              respuesta.mensaje
            );


            this.cdr
              .detectChanges();

          },


        error:
          error => {

            console.error(
              '❌ Error enviando puzzle:',
              error
            );


            this.mostrarMensaje(
              'error',
              error?.error?.mensaje ||
              'No se pudo enviar el puzzle.'
            );


            this.cdr
              .detectChanges();

          }

      });

  }


  enviarCorreoPersonalizado(): void {

  if (!this.claveAdmin.trim()) {

    this.mostrarMensaje(
      'error',
      'Ingresa tu clave administrativa.'
    );

    return;
  }


  if (!this.asunto.trim()) {

    this.mostrarMensaje(
      'error',
      'Escribe un asunto.'
    );

    return;
  }


  if (!this.mensaje.trim()) {

    this.mostrarMensaje(
      'error',
      'Escribe el contenido del correo.'
    );

    return;
  }


  this.enviandoCorreo =
    true;

  this.cdr.detectChanges();


  const headers =
    new HttpHeaders({

      'X-Admin-Token':
        this.claveAdmin

    });


  this.http
    .post<{
      ok: boolean;
      mensaje: string;
    }>(
      'https://aniversario-mb40.onrender.com/api/admin/correo',
      {
        asunto:
          this.asunto,

        mensaje:
          this.mensaje
      },
      {
        headers
      }
    )
    .pipe(

      finalize(
        () => {

          console.log(
            '🏁 Terminó envío de correo'
          );


          this.enviandoCorreo =
            false;


          this.cdr
            .detectChanges();

        }
      )

    )
    .subscribe({

      next:
        respuesta => {

          this.mostrarMensaje(
            'success',
            respuesta.mensaje
          );


          this.asunto =
            '';

          this.mensaje =
            '';


          this.cdr
            .detectChanges();

        },


      error:
        error => {

          console.error(
            '❌ Error correo:',
            error
          );


          this.mostrarMensaje(
            'error',
            error?.error?.mensaje ||
            'No se pudo enviar el correo.'
          );


          this.cdr
            .detectChanges();

        }

    });

}


  mostrarMensaje(
  tipo: string,
  mensaje: string
): void {

  this.notificacion = {

    visible: true,

    tipo,

    mensaje

  };


  this.cdr
    .detectChanges();


  setTimeout(
    () => {

      this.notificacion =
        {
          ...this.notificacion,
          visible: false
        };


      this.cdr
        .detectChanges();

    },
    4000
  );
}
}
