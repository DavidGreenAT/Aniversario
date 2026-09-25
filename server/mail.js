import "dotenv/config";

import { google } from "googleapis";


/*
 * =========================================================
 * VARIABLES
 * =========================================================
 */

const GMAIL_USER =
  process.env.GMAIL_USER?.trim();

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID?.trim();

const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET?.trim();

const GOOGLE_REFRESH_TOKEN =
  process.env.GOOGLE_REFRESH_TOKEN?.trim();


/*
 * =========================================================
 * VALIDACIÓN
 * =========================================================
 */

if (!GMAIL_USER) {

  throw new Error(
    "Falta GMAIL_USER"
  );

}


if (!GOOGLE_CLIENT_ID) {

  throw new Error(
    "Falta GOOGLE_CLIENT_ID"
  );

}


if (!GOOGLE_CLIENT_SECRET) {

  throw new Error(
    "Falta GOOGLE_CLIENT_SECRET"
  );

}


if (!GOOGLE_REFRESH_TOKEN) {

  throw new Error(
    "Falta GOOGLE_REFRESH_TOKEN"
  );

}


/*
 * =========================================================
 * OAUTH 2.0
 * =========================================================
 */

const oauth2Client =
  new google.auth.OAuth2(

    GOOGLE_CLIENT_ID,

    GOOGLE_CLIENT_SECRET

  );


oauth2Client.setCredentials({

  refresh_token:
    GOOGLE_REFRESH_TOKEN

});


/*
 * =========================================================
 * GMAIL API
 * =========================================================
 */

const gmail =
  google.gmail({

    version:
      "v1",

    auth:
      oauth2Client

  });


/*
 * =========================================================
 * UTILIDADES
 * =========================================================
 */

function limpiarHeader(
  valor = ""
) {

  return String(valor)
    .replace(
      /[\r\n]+/g,
      " "
    )
    .trim();

}


function codificarHeader(
  texto
) {

  return (
    "=?UTF-8?B?" +
    Buffer
      .from(
        texto,
        "utf8"
      )
      .toString(
        "base64"
      ) +
    "?="
  );

}


function convertirBase64Url(
  texto
) {

  return Buffer
    .from(
      texto,
      "utf8"
    )
    .toString(
      "base64"
    )
    .replace(
      /\+/g,
      "-"
    )
    .replace(
      /\//g,
      "_"
    )
    .replace(
      /=+$/g,
      ""
    );

}


/*
 * =========================================================
 * ENVIAR CORREO
 * =========================================================
 */

export async function enviarCorreo(
  destinatario,
  asunto,
  mensaje
) {

  /*
   * Sanitizar headers
   */

  const destinatarioSeguro =
    limpiarHeader(
      destinatario
    );


  const asuntoSeguro =
    limpiarHeader(
      asunto
    );


  if (!destinatarioSeguro) {

    throw new Error(
      "El destinatario está vacío."
    );

  }


  if (!asuntoSeguro) {

    throw new Error(
      "El asunto está vacío."
    );

  }


  /*
   * =======================================================
   * HEADERS MIME
   * =======================================================
   */

  const nombreRemitente =
    codificarHeader(
      "Nuestra cita 💛"
    );


  const asuntoCodificado =
    codificarHeader(
      asuntoSeguro
    );


  /*
   * =======================================================
   * MENSAJE MIME
   * =======================================================
   */

  const correo = [

    `From: ${nombreRemitente} <${GMAIL_USER}>`,

    `To: ${destinatarioSeguro}`,

    `Subject: ${asuntoCodificado}`,

    "MIME-Version: 1.0",

    'Content-Type: text/html; charset="UTF-8"',

    "Content-Transfer-Encoding: 8bit",

    "",

    mensaje

  ].join(
    "\r\n"
  );


  /*
   * Gmail API requiere base64url
   */

  const raw =
    convertirBase64Url(
      correo
    );


  console.log(
    `📤 Gmail API → ${destinatarioSeguro}`
  );


  /*
   * =======================================================
   * ENVIAR
   * =======================================================
   */

  const respuesta =
    await gmail.users.messages.send({

      userId:
        "me",

      requestBody: {

        raw

      }

    });


  console.log(
    `✅ Gmail API envió el correo a ${destinatarioSeguro}`
  );


  console.log(
    "🆔 Gmail Message ID:",
    respuesta.data.id
  );


  /*
   * =======================================================
   * COMPATIBILIDAD CON TU CÓDIGO ACTUAL
   * =======================================================
   *
   * Tu servidor actualmente espera propiedades de
   * Nodemailer como:
   *
   * info.messageId
   * info.accepted
   * info.rejected
   * info.response
   *
   * Las simulamos para no tener que modificar servidor.js,
   * invitador.js, puzzles, etc.
   *
   * =======================================================
   */

  return {

    messageId:
      respuesta.data.id,

    accepted: [
      destinatarioSeguro
    ],

    rejected: [],

    response:
      `Gmail API OK - ${respuesta.data.id}`,

    threadId:
      respuesta.data.threadId

  };

}
