import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { enviarCorreo } from "./mail.js";


export async function enviarInvitacion() {

  try {

    console.log("💌 Enviando invitaciones...");


    /*
     * =========================================================
     * DESTINATARIOS
     * =========================================================
     */

    const destinatarios = [

      process.env.PAREJA_EMAIL?.trim(),

      process.env.OTRO_EMAIL?.trim()

    ].filter(Boolean);


    /*
     * Debemos tener exactamente
     * los dos correos configurados.
     */

    if (
      destinatarios.length !== 2
    ) {

      throw new Error(
        `Se esperaban 2 destinatarios, pero se encontraron ${destinatarios.length}. Revisa PAREJA_EMAIL y OTRO_EMAIL en tu .env`
      );

    }


    /*
     * =========================================================
     * URL FRONTEND
     * =========================================================
     */

    const appUrl =
      process.env.APP_URL?.trim();


    if (!appUrl) {

      throw new Error(
        "Falta APP_URL en las variables de entorno."
      );

    }


    /*
     * =========================================================
     * CORREO
     * =========================================================
     */

    const asunto =
      "Hay algo especial que se acerca 💛";


    const html = `
      <div style="
        margin:0;
        padding:40px 20px;
        background:#fffaf5;
        font-family:Arial,Helvetica,sans-serif;
        color:#333;
      ">

        <div style="
          max-width:600px;
          margin:0 auto;
          background:#ffffff;
          border-radius:20px;
          padding:45px 35px;
          box-shadow:0 8px 30px rgba(0,0,0,.08);
          text-align:center;
        ">

          <div style="
            font-size:42px;
            margin-bottom:15px;
          ">
            💛
          </div>


          <h1 style="
            margin:0 0 25px;
            font-size:28px;
            color:#2d2d2d;
          ">
            Hola, pingüinita 🐧
          </h1>


          <p style="
            font-size:17px;
            line-height:1.8;
            color:#555;
          ">
            Espero que te encuentres muy bien, amorcito.
          </p>


          <p style="
            font-size:17px;
            line-height:1.8;
            color:#555;
          ">
            Si este correo llegó hasta ti, es porque hay algo
            muy importante que se acerca y quiero que sea
            realmente especial.
          </p>


          <p style="
            font-size:17px;
            line-height:1.8;
            color:#555;
          ">
            A continuación encontrarás algunas fechas para elegir.
            Quiero que elijas la que más te guste o la que mejor
            te funcione.
          </p>


          <div style="
            margin:25px 0;
            padding:20px;
            background:#fff8df;
            border-radius:15px;
          ">

            <p>
              💛 Miércoles 30 de septiembre — 6:00 p.m.
            </p>

            <p>
              💛 Jueves 1 de octubre — 6:00 p.m.
            </p>

            <p>
              💛 Sábado 3 de octubre — 5:00 p.m.
            </p>

          </div>


          <div style="
            margin:30px 0;
            padding:22px;
            background:#fff8df;
            border-radius:14px;
            border:1px solid #f4df93;
          ">

            <p style="
              margin:0;
              font-size:16px;
              line-height:1.7;
              color:#5a4a17;
            ">
              ✨ Si la fecha que quieres no aparece entre las opciones,
              no pasa nada. Podrás elegir otra fecha y hora dentro
              de la página.
            </p>

          </div>


          <p style="
            font-size:17px;
            line-height:1.8;
            color:#555;
          ">
            Cuando estés lista, presiona el siguiente botón.
          </p>


          <a
            href="${appUrl}/login"
            style="
              display:inline-block;
              margin-top:20px;
              padding:15px 30px;
              background:#f2cf5b;
              color:#222;
              text-decoration:none;
              border-radius:30px;
              font-weight:bold;
            "
          >
            Elegir nuestra fecha 💛
          </a>


          <p style="
            margin-top:35px;
            font-size:17px;
            line-height:1.8;
            color:#555;
          ">
            Y después... mantente muy atenta, porque esto
            es solo el comienzo. Pronto recibirás algo más. 💌
          </p>


          <div style="
            width:60px;
            height:2px;
            background:#e8c75a;
            margin:35px auto;
          "></div>


          <p style="
            font-size:20px;
            margin:0;
          ">
            Te amo infinitamente.
          </p>


          <p style="
            margin-top:10px;
            font-size:26px;
          ">
            ♡
          </p>

        </div>

      </div>
    `;


    /*
     * =========================================================
     * LOG DESTINATARIOS
     * =========================================================
     */

    console.log(
      "📧 Destinatarios:",
      destinatarios
    );


    console.log(
      "🌐 Link:",
      `${appUrl}/login`
    );


    /*
     * =========================================================
     * ENVIAR A LOS DOS
     * =========================================================
     */

    const resultados =
      await Promise.allSettled(

        destinatarios.map(

          async correo => {

            console.log(
              `📤 Intentando enviar a ${correo}...`
            );


            const info =
              await enviarCorreo(
                correo,
                asunto,
                html
              );


            /*
             * Nodemailer puede terminar correctamente
             * pero Gmail puede rechazar el destinatario.
             */

            if (
              info.rejected &&
              info.rejected.length > 0
            ) {

              throw new Error(
                `Gmail rechazó el destinatario ${correo}: ${info.rejected.join(", ")}`
              );

            }


            return {

              correo,

              messageId:
                info.messageId,

              accepted:
                info.accepted,

              rejected:
                info.rejected,

              response:
                info.response

            };

          }

        )

      );


    /*
     * =========================================================
     * RESULTADOS
     * =========================================================
     */

    resultados.forEach(
      (resultado, index) => {

        const correo =
          destinatarios[index];


        if (
          resultado.status ===
          "fulfilled"
        ) {

          console.log("");
          console.log(
            `✅ Invitación enviada a ${correo}`
          );

          console.log(
            "🆔 Message ID:",
            resultado.value.messageId
          );

          console.log(
            "✅ Aceptados:",
            resultado.value.accepted
          );

          console.log(
            "❌ Rechazados:",
            resultado.value.rejected
          );

          console.log(
            "📨 Respuesta:",
            resultado.value.response
          );

        }

        else {

          console.log("");

          console.error(
            `❌ Error enviando a ${correo}`
          );

          console.error(
            resultado.reason
          );

        }

      }
    );


    /*
     * =========================================================
     * CONTAR RESULTADOS
     * =========================================================
     */

    const enviados =
      resultados.filter(
        resultado =>
          resultado.status === "fulfilled"
      ).length;


    const total =
      destinatarios.length;


    /*
     * =========================================================
     * VALIDAR QUE LOS DOS SE ENVIARON
     * =========================================================
     */

    if (
      enviados !== total
    ) {

      throw new Error(
        `Solo se enviaron ${enviados} de ${total} invitaciones.`
      );

    }


    console.log("");
    console.log(
      `💛 Invitaciones enviadas: ${enviados}/${total}`
    );


    return {

      enviados,

      total,

      destinatarios

    };

  }

  catch (error) {

    console.error("");
    console.error(
      "❌ No se pudieron enviar todas las invitaciones:"
    );

    console.error(error);

    throw error;

  }

}


/*
 * =========================================================
 * EJECUCIÓN MANUAL DESDE TERMINAL
 * =========================================================
 *
 * Esto permite ejecutar:
 *
 * node server/invitador.js
 *
 * Pero NO enviará automáticamente el correo cuando
 * servidor.js importe enviarInvitacion().
 *
 * =========================================================
 */


const archivoActual =
  path.resolve(
    fileURLToPath(
      import.meta.url
    )
  );


const archivoEjecutado =
  process.argv[1]
    ? path.resolve(
        process.argv[1]
      )
    : null;


if (
  archivoEjecutado &&
  archivoActual === archivoEjecutado
) {

  console.log("");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  console.log(
    "🚀 Ejecutando invitador manualmente"
  );

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  console.log("");


  enviarInvitacion()

    .then(
      resultado => {

        console.log("");
        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

        console.log(
          "💛 PROCESO TERMINADO"
        );

        console.log(
          `📧 Enviados: ${resultado.enviados}/${resultado.total}`
        );

        console.log(
          "👥 Destinatarios:"
        );


        resultado.destinatarios.forEach(
          correo => {

            console.log(
              `   ✅ ${correo}`
            );

          }
        );


        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

        console.log("");

      }
    )

    .catch(
      error => {

        console.log("");
        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

        console.error(
          "❌ EL ENVÍO NO SE COMPLETÓ"
        );

        console.error(
          error.message
        );

        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

        console.log("");

        process.exitCode = 1;

      }
    );

}
