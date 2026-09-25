import http from "node:http";

import { enviarCorreo } from "./mail.js";

import { enviarInvitacion } from "./invitador.js";

import {
  obtenerPuzzle,
  generarCorreoPuzzle
} from "./puzzles.js";

import {
  generarOutfitsDesdeRequest
} from "./outfits.js";

import fs from "node:fs/promises";
import path from "node:path";


/*
 * =========================================================
 * CONFIGURACIÓN
 * =========================================================
 */

const PORT = process.env.PORT || 3000;

const MI_EMAIL =
  process.env.MI_EMAIL?.trim();

const PAREJA_EMAIL =
  process.env.PAREJA_EMAIL?.trim();

const OTRO_EMAIL =
  process.env.OTRO_EMAIL?.trim();

const ADMIN_TOKEN =
  process.env.ADMIN_TOKEN?.trim();

const APP_URL =
  process.env.APP_URL?.trim();

const BACKEND_URL =
  process.env.BACKEND_URL?.trim();


/*
 * Validar variables de entorno
 */

if (!MI_EMAIL) {
  console.error("❌ Falta MI_EMAIL");
  process.exit(1);
}

if (!PAREJA_EMAIL) {
  console.error("❌ Falta PAREJA_EMAIL");
  process.exit(1);
}

if (!OTRO_EMAIL) {
  console.error("❌ Falta OTRO_EMAIL");
  process.exit(1);
}

if (!ADMIN_TOKEN) {
  console.error("❌ Falta ADMIN_TOKEN");
  process.exit(1);
}

if (!APP_URL) {
  console.error("❌ Falta APP_URL");
  process.exit(1);
}

if (!BACKEND_URL) {
  console.error("❌ Falta BACKEND_URL");
  process.exit(1);
}


/*
 * =========================================================
 * RESPUESTAS HTTP
 * =========================================================
 */

function responder(res, codigo, datos) {

  res.writeHead(codigo, {

    "Content-Type":
      "application/json; charset=utf-8",

    "Access-Control-Allow-Origin":
      APP_URL,

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, X-Admin-Token"

  });

  res.end(
    JSON.stringify(datos)
  );

}


/*
 * =========================================================
 * UTILIDADES
 * =========================================================
 */

function escaparHTML(texto = "") {

  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function capitalizar(texto = "") {

  if (!texto) {
    return "";
  }

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  );

}


function formatearFecha(valor) {

  if (!valor) {
    return "No especificada";
  }

  const [fecha, hora = "00:00"] =
    valor.split("T");

  const [anio, mes, dia] =
    fecha.split("-").map(Number);

  const [horas, minutos] =
    hora.split(":").map(Number);


  const fechaObjeto = new Date(
    Date.UTC(
      anio,
      mes - 1,
      dia,
      12,
      0,
      0
    )
  );


  const fechaTexto =
    new Intl.DateTimeFormat(
      "es-MX",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }
    ).format(fechaObjeto);


  const hora12 =
    horas % 12 || 12;

  const periodo =
    horas >= 12
      ? "p.m."
      : "a.m.";


  return `${capitalizar(fechaTexto)} — ${hora12}:${String(
    minutos
  ).padStart(2, "0")} ${periodo}`;

}


/*
 * =========================================================
 * LEER BODY
 * =========================================================
 */

async function leerBody(req) {

  let body = "";

  for await (const chunk of req) {

    body += chunk;

    if (body.length > 50000) {

      throw new Error(
        "El cuerpo de la petición es demasiado grande."
      );

    }

  }

  return JSON.parse(
    body || "{}"
  );

}


/*
 * =========================================================
 * ADMIN
 * =========================================================
 */

function validarAdmin(req) {

  const token =
    req.headers["x-admin-token"];

  return (
    typeof token === "string" &&
    token === ADMIN_TOKEN
  );

}


/*
 * =========================================================
 * VALIDACIÓN CITA
 * =========================================================
 */

function validarDatosCita(datos) {

  const errores = [];


  if (
    !datos.name ||
    datos.name.trim().length < 2
  ) {

    errores.push(
      "El nombre debe contener al menos 2 caracteres."
    );

  }


  if (
    datos.name?.trim().length > 50
  ) {

    errores.push(
      "El nombre no puede superar los 50 caracteres."
    );

  }


  if (!datos.fecha) {

    errores.push(
      "Debes seleccionar una fecha."
    );

  }


  if (datos.fecha) {

    const fecha =
      new Date(datos.fecha);


    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {

      errores.push(
        "La fecha seleccionada no es válida."
      );

    }


    if (
      !Number.isNaN(fecha.getTime()) &&
      fecha.getTime() < Date.now()
    ) {

      errores.push(
        "La fecha debe ser posterior al momento actual."
      );

    }

  }


  if (
    !datos.lugar ||
    datos.lugar.trim().length < 2
  ) {

    errores.push(
      "Indica un lugar o escribe que lo dejas en mis manos."
    );

  }


  if (
    !datos.comida ||
    datos.comida.trim().length < 2
  ) {

    errores.push(
      "Indica qué comida prefieres."
    );

  }


  if (
    !datos.tipoVestimenta
  ) {

    errores.push(
      "Selecciona un tipo de vestimenta."
    );

  }


  if (
    datos.mensaje &&
    datos.mensaje.length > 500
  ) {

    errores.push(
      "El mensaje no puede superar los 500 caracteres."
    );

  }


  return errores;

}


/*
 * =========================================================
 * SERVIDOR
 * =========================================================
 */

const server =
  http.createServer(
    async (req, res) => {

      /*
       * ===============================================
       * CORS PREFLIGHT
       * ===============================================
       */

      if (req.method === "OPTIONS") {

        responder(
          res,
          204,
          {}
        );

        return;
      }


      /*
       * =========================================================
       * SERVIR OUTFITS GENERADOS
       * =========================================================
       */

      if (
        req.method === "GET" &&
        req.url?.startsWith(
          "/media/outfits/generados/"
        )
      ) {

        try {

          const nombreArchivo =
            path.basename(
              decodeURIComponent(
                req.url.replace(
                  "/media/outfits/generados/",
                  ""
                )
              )
            );


          const ruta =
            path.join(
              process.cwd(),
              "storage",
              "outfits",
              "generados",
              nombreArchivo
            );


          const imagen =
            await fs.readFile(
              ruta
            );


          res.writeHead(
            200,
            {
              "Content-Type":
                "image/png",

              "Content-Length":
                imagen.length,

              "Cache-Control":
                "public, max-age=86400",

              "Access-Control-Allow-Origin":
                APP_URL
            }
          );


          res.end(
            imagen
          );

        } catch (error) {

          if (
            error?.code ===
            "ENOENT"
          ) {

            responder(
              res,
              404,
              {
                ok: false,
                mensaje:
                  "El outfit no existe."
              }
            );

            return;
          }


          console.error(
            "❌ Error cargando outfit:",
            error
          );


          responder(
            res,
            500,
            {
              ok: false,
              mensaje:
                "No se pudo cargar el outfit."
            }
          );

        }

        return;
      }


      /*
       * =========================================================
       * DESCARGAR OUTFIT
       * =========================================================
       */

      if (
        req.method === "GET" &&
        req.url?.startsWith(
          "/api/outfits/descargar"
        )
      ) {

        try {

          const url =
            new URL(
              req.url,
              BACKEND_URL
            );


          const archivoSolicitado =
            url.searchParams
              .get("archivo");


          if (!archivoSolicitado) {

            responder(
              res,
              400,
              {
                ok: false,
                mensaje:
                  "No se indicó qué outfit descargar."
              }
            );

            return;
          }


          const nombreArchivo =
            path.basename(
              archivoSolicitado
            );


          if (
            !nombreArchivo
              .toLowerCase()
              .endsWith(".png")
          ) {

            responder(
              res,
              400,
              {
                ok: false,
                mensaje:
                  "Archivo no válido."
              }
            );

            return;
          }


          const ruta =
            path.join(
              process.cwd(),
              "storage",
              "outfits",
              "generados",
              nombreArchivo
            );


          const imagen =
            await fs.readFile(
              ruta
            );


          const nombreDescarga =
            `Outfit-Amorcito-${Date.now()}.png`;


          res.writeHead(
            200,
            {
              "Content-Type":
                "image/png",

              "Content-Length":
                imagen.length,

              "Content-Disposition":
                `attachment; filename="${nombreDescarga}"`,

              "Access-Control-Allow-Origin":
                APP_URL
            }
          );


          res.end(
            imagen
          );

        } catch (error) {

          if (
            error?.code ===
            "ENOENT"
          ) {

            responder(
              res,
              404,
              {
                ok: false,
                mensaje:
                  "El outfit ya no existe."
              }
            );

            return;
          }


          console.error(
            "❌ Error descargando outfit:",
            error
          );


          responder(
            res,
            500,
            {
              ok: false,
              mensaje:
                "No se pudo descargar el outfit."
            }
          );

        }

        return;
      }


      /*
       * =========================================================
       * HISTORIAL DE OUTFITS
       * =========================================================
       */

      if (
        req.method === "GET" &&
        req.url === "/api/outfits/historial"
      ) {

        try {

          const carpeta =
            path.join(
              process.cwd(),
              "storage",
              "outfits",
              "generados"
            );


          await fs.mkdir(
            carpeta,
            {
              recursive: true
            }
          );


          const archivos =
            await fs.readdir(
              carpeta,
              {
                withFileTypes: true
              }
            );


          const archivosImagen =
            archivos.filter(
              archivo =>
                archivo.isFile() &&
                archivo.name
                  .toLowerCase()
                  .endsWith(".png")
            );


          const outfits =
            await Promise.all(

              archivosImagen.map(
                async archivo => {

                  const ruta =
                    path.join(
                      carpeta,
                      archivo.name
                    );


                  const estadisticas =
                    await fs.stat(
                      ruta
                    );


                  return {

                    id:
                      archivo.name,

                    archivo:
                      archivo.name,

                    imagen:
                      `${BACKEND_URL}/media/outfits/generados/${encodeURIComponent(
                        archivo.name
                      )}`,

                    fecha:
                      estadisticas
                        .mtime
                        .toISOString(),

                    timestamp:
                      estadisticas
                        .mtimeMs

                  };

                }
              )

            );


          outfits.sort(
            (a, b) =>
              b.timestamp -
              a.timestamp
          );


          responder(
            res,
            200,
            {
              ok: true,
              outfits
            }
          );

        } catch (error) {

          console.error(
            "❌ Error cargando historial:",
            error
          );


          responder(
            res,
            500,
            {
              ok: false,
              mensaje:
                "No se pudo cargar el historial de outfits."
            }
          );

        }

        return;
      }


      /*
       * ===============================================
       * ADMIN - ENVIAR INVITACIÓN INICIAL
       * ===============================================
       */

      if (
        req.method === "POST" &&
        req.url === "/api/admin/invitacion"
      ) {

        if (!validarAdmin(req)) {

          responder(
            res,
            401,
            {
              ok: false,
              mensaje:
                "Clave administrativa incorrecta."
            }
          );

          return;
        }


        try {

          console.log(
            "💌 Solicitud para enviar invitación inicial"
          );


          const resultado =
            await enviarInvitacion();


          responder(
            res,
            200,
            {
              ok: true,

              mensaje:
                "Invitaciones enviadas correctamente 💛",

              enviados:
                resultado.enviados,

              total:
                resultado.total,

              destinatarios:
                resultado.destinatarios
            }
          );

        } catch (error) {

          console.error(
            "❌ Error enviando invitación inicial:"
          );

          console.error(
            error
          );


          responder(
            res,
            500,
            {
              ok: false,

              mensaje:
                "No se pudieron enviar las invitaciones.",

              error:
                error.message
            }
          );

        }

        return;
      }


      /*
       * ===============================================
       * ADMIN - ENVIAR PUZZLE
       * ===============================================
       */

      if (
        req.method === "POST" &&
        req.url === "/api/admin/puzzle"
      ) {

        if (!validarAdmin(req)) {

          responder(
            res,
            401,
            {
              ok: false,
              mensaje:
                "Clave administrativa incorrecta."
            }
          );

          return;
        }


        try {

          const datos =
            await leerBody(req);

          const numero =
            Number(datos.numero);


          if (
            ![1, 2, 3, 4]
              .includes(numero)
          ) {

            responder(
              res,
              400,
              {
                ok: false,
                mensaje:
                  "Puzzle no válido."
              }
            );

            return;
          }


          const puzzle =
            obtenerPuzzle(
              numero,
              APP_URL
            );


          if (!puzzle) {

            responder(
              res,
              404,
              {
                ok: false,
                mensaje:
                  "No se encontró el puzzle."
              }
            );

            return;
          }


          const html =
            generarCorreoPuzzle(
              puzzle
            );


          console.log(
            "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          );


          console.log(
            `🧩 Intentando enviar Puzzle ${numero}`
          );


          console.log(
            "📧 Destinatario:",
            PAREJA_EMAIL
          );


          console.log(
            "📌 Asunto:",
            puzzle.asunto
          );


          console.log(
            "🔗 URL:",
            puzzle.url
          );


          const info =
            await enviarCorreo(

              PAREJA_EMAIL,

              puzzle.asunto,

              html

            );


          console.log(
            "✅ Nodemailer terminó el envío"
          );


          console.log(
            "🆔 Message ID:",
            info.messageId
          );


          console.log(
            "✅ Aceptados:",
            info.accepted
          );


          console.log(
            "❌ Rechazados:",
            info.rejected
          );


          console.log(
            "📨 Respuesta SMTP:",
            info.response
          );


          console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
          );


          if (
            info.rejected &&
            info.rejected.length > 0
          ) {

            responder(
              res,
              500,
              {
                ok: false,
                mensaje:
                  "Gmail rechazó el destinatario."
              }
            );

            return;
          }


          responder(
            res,
            200,
            {
              ok: true,

              mensaje:
                `Puzzle ${numero} enviado correctamente 💛`,

              destinatario:
                PAREJA_EMAIL
            }
          );


        } catch (error) {

          console.error(
            "❌ Error enviando puzzle:"
          );


          console.error(
            error
          );


          responder(
            res,
            500,
            {
              ok: false,
              mensaje:
                "No se pudo enviar el puzzle."
            }
          );

        }

        return;
      }


      /*
       * ===============================================
       * GENERAR OUTFITS
       * ===============================================
       */

      if (
        req.method === "POST" &&
        req.url === "/api/outfits"
      ) {

        try {

          console.log(
            "👗 Solicitud de outfits recibida"
          );


          const imagenes =
            await generarOutfitsDesdeRequest(
              req
            );


          responder(
            res,
            200,
            {
              ok: true,
              imagenes
            }
          );

        } catch (error) {

          console.error(
            "❌ Error generando outfits:"
          );


          console.error(
            error
          );


          responder(
            res,
            500,
            {
              ok: false,

              mensaje:
                error.message ||
                "No se pudieron generar los outfits."
            }
          );

        }

        return;
      }


      /*
       * ===============================================
       * ADMIN - CORREO PERSONALIZADO
       * ===============================================
       */

      if (
        req.method === "POST" &&
        req.url === "/api/admin/correo"
      ) {

        if (!validarAdmin(req)) {

          responder(
            res,
            401,
            {
              ok: false,
              mensaje:
                "Clave administrativa incorrecta."
            }
          );

          return;
        }


        try {

          const datos =
            await leerBody(req);

          const asunto =
            datos.asunto?.trim();

          const mensaje =
            datos.mensaje?.trim();


          if (
            !asunto ||
            !mensaje
          ) {

            responder(
              res,
              400,
              {
                ok: false,
                mensaje:
                  "El asunto y el mensaje son obligatorios."
              }
            );

            return;
          }


          if (
            asunto.length > 120
          ) {

            responder(
              res,
              400,
              {
                ok: false,
                mensaje:
                  "El asunto es demasiado largo."
              }
            );

            return;
          }


          if (
            mensaje.length > 3000
          ) {

            responder(
              res,
              400,
              {
                ok: false,
                mensaje:
                  "El mensaje es demasiado largo."
              }
            );

            return;
          }


          const mensajeSeguro =
            escaparHTML(mensaje)
              .replaceAll(
                "\n",
                "<br>"
              );


          const html = `

            <div style="
              margin:0;
              padding:40px 20px;
              background:#fffaf5;
              font-family:Arial,Helvetica,sans-serif;
            ">

              <div style="
                max-width:600px;
                margin:auto;
                background:#ffffff;
                border-radius:24px;
                padding:40px;
                box-shadow:0 10px 30px rgba(0,0,0,.08);
              ">

                <div style="
                  text-align:center;
                  font-size:42px;
                ">
                  💌
                </div>


                <h1 style="
                  text-align:center;
                  color:#e85d75;
                ">
                  ${escaparHTML(asunto)}
                </h1>


                <div style="
                  margin-top:30px;
                  color:#555555;
                  font-size:16px;
                  line-height:1.8;
                ">
                  ${mensajeSeguro}
                </div>


                <div style="
                  width:60px;
                  height:2px;
                  background:#e8c75a;
                  margin:35px auto;
                "></div>


                <p style="
                  text-align:center;
                  color:#444444;
                  font-size:18px;
                ">
                  Te amo infinitamente. ♡
                </p>

              </div>

            </div>

          `;


          console.log(
            "\n💌 Enviando correo personalizado..."
          );


          console.log(
            "📧 Destinatario:",
            PAREJA_EMAIL
          );


          const info =
            await enviarCorreo(

              PAREJA_EMAIL,

              asunto,

              html

            );


          console.log(
            "✅ Correo personalizado enviado"
          );


          console.log(
            "🆔:",
            info.messageId
          );


          console.log(
            "✅ Aceptados:",
            info.accepted
          );


          console.log(
            "❌ Rechazados:",
            info.rejected
          );


          responder(
            res,
            200,
            {
              ok: true,
              mensaje:
                "Correo enviado correctamente 💌"
            }
          );


        } catch (error) {

          console.error(
            "❌ Error enviando correo personalizado:"
          );


          console.error(
            error
          );


          responder(
            res,
            500,
            {
              ok: false,
              mensaje:
                "No se pudo enviar el correo."
            }
          );

        }

        return;
      }


      /*
       * ===============================================
       * FORMULARIO CITA
       * ===============================================
       */

      if (
        req.method === "POST" &&
        req.url === "/api/cita"
      ) {

        try {

          const datos =
            await leerBody(req);


          console.log(
            "📦 Datos recibidos:",
            datos
          );


          const errores =
            validarDatosCita(
              datos
            );


          if (
            errores.length > 0
          ) {

            responder(
              res,
              400,
              {
                ok: false,
                mensaje:
                  errores[0],
                errores
              }
            );

            return;
          }


          const name =
            datos.name.trim();


          const fechaBonita =
            formatearFecha(
              datos.fecha
            );


          const lugar =
            escaparHTML(
              datos.lugar.trim()
            );


          const comida =
            escaparHTML(
              datos.comida.trim()
            );


          const tipoVestimenta =
            escaparHTML(
              datos.tipoVestimenta
            );


          const mensaje =
            datos.mensaje?.trim()

              ? escaparHTML(
                  datos.mensaje.trim()
                )

              : "No dejó ningún mensaje.";


          /*
           * ===========================================
           * CORREO PARA TI
           * ===========================================
           */

          const correoParaMi = `

            <div style="
              margin:0;
              padding:40px 20px;
              background:#fff7f8;
              font-family:Arial,Helvetica,sans-serif;
              color:#333333;
            ">

              <div style="
                max-width:600px;
                margin:auto;
                background:#ffffff;
                border-radius:24px;
                padding:40px;
                box-shadow:0 10px 30px rgba(0,0,0,.08);
              ">

                <div style="
                  text-align:center;
                  font-size:45px;
                ">
                  💛
                </div>


                <h1 style="
                  text-align:center;
                  color:#e85d75;
                ">
                  ¡Tenemos una cita!
                </h1>


                <p style="
                  text-align:center;
                  color:#777777;
                  line-height:1.7;
                ">
                  ${escaparHTML(name)}
                  respondió tu invitación.
                </p>


                <div style="
                  margin-top:30px;
                  padding:20px;
                  background:#fff5f6;
                  border-radius:16px;
                ">

                  <strong style="
                    color:#e85d75;
                  ">
                    📅 Fecha elegida
                  </strong>

                  <p style="
                    font-size:17px;
                  ">
                    ${escaparHTML(fechaBonita)}
                  </p>

                </div>


                <div style="
                  padding:18px 0;
                  border-bottom:1px solid #eeeeee;
                ">

                  <strong>
                    📍 Lugar
                  </strong>

                  <p style="
                    color:#666666;
                  ">
                    ${lugar}
                  </p>

                </div>


                <div style="
                  padding:18px 0;
                  border-bottom:1px solid #eeeeee;
                ">

                  <strong>
                    🍝 Comida
                  </strong>

                  <p style="
                    color:#666666;
                  ">
                    ${comida}
                  </p>

                </div>


                <div style="
                  padding:18px 0;
                  border-bottom:1px solid #eeeeee;
                ">

                  <strong>
                    👗 Vestimenta
                  </strong>

                  <p style="
                    color:#666666;
                  ">
                    ${tipoVestimenta}
                  </p>

                </div>


                <div style="
                  margin-top:25px;
                  padding:20px;
                  background:#fff8df;
                  border-radius:15px;
                ">

                  <strong style="
                    color:#806314;
                  ">
                    💌 Mensaje
                  </strong>

                  <p style="
                    color:#6b5a25;
                    line-height:1.7;
                  ">
                    ${mensaje}
                  </p>

                </div>


                <p style="
                  margin-top:35px;
                  text-align:center;
                  color:#999999;
                  font-size:13px;
                ">
                  Ahora te toca preparar algo especial. 💛
                </p>

              </div>

            </div>

          `;


          /*
           * ===========================================
           * CORREO PARA ELLA
           * ===========================================
           */

          const correoParaElla = `

            <div style="
              margin:0;
              padding:40px 20px;
              background:#fffaf5;
              font-family:Arial,Helvetica,sans-serif;
              color:#333333;
            ">

              <div style="
                max-width:600px;
                margin:auto;
                background:#ffffff;
                border-radius:24px;
                padding:45px 35px;
                box-shadow:0 10px 30px rgba(0,0,0,.08);
                text-align:center;
              ">

                <div style="
                  font-size:45px;
                ">
                  💌
                </div>


                <h1 style="
                  color:#e85d75;
                  font-size:28px;
                ">
                  Recibí tu elección, amorcito ♡
                </h1>


                <p style="
                  color:#666666;
                  line-height:1.8;
                ">
                  Tu respuesta llegó perfectamente.
                </p>


                <p style="
                  color:#666666;
                ">
                  La fecha que elegiste es:
                </p>


                <div style="
                  margin:25px 0;
                  padding:22px;
                  background:#fff5f6;
                  border-radius:16px;
                ">

                  <div style="
                    font-size:24px;
                  ">
                    📅
                  </div>

                  <p style="
                    color:#e85d75;
                    font-size:18px;
                    font-weight:bold;
                  ">
                    ${escaparHTML(fechaBonita)}
                  </p>

                </div>


                <p style="
                  color:#666666;
                  line-height:1.8;
                ">
                  Ahora no tienes que hacer nada más.
                </p>


                <p style="
                  color:#666666;
                  line-height:1.8;
                ">
                  Solo mantente atenta, porque aún quedan
                  algunas sorpresas por descubrir... ✨
                </p>


                <div style="
                  width:60px;
                  height:2px;
                  background:#e8c75a;
                  margin:30px auto;
                "></div>


                <p style="
                  font-size:20px;
                ">
                  Te amo infinitamente.
                </p>


                <p style="
                  font-size:28px;
                ">
                  ♡
                </p>

              </div>

            </div>

          `;


          /*
           * ===========================================
           * ENVIAR AMBOS
           * ===========================================
           */

          const resultados =
            await Promise.allSettled([

              enviarCorreo(
                MI_EMAIL,

                `💛 ${name} respondió tu invitación`,

                correoParaMi
              ),

              enviarCorreo(
                PAREJA_EMAIL,

                "Tu elección fue recibida 💌",

                correoParaElla
              )

            ]);


          resultados.forEach(
            (resultado, index) => {

              const destinatario =
                index === 0
                  ? MI_EMAIL
                  : PAREJA_EMAIL;


              if (
                resultado.status ===
                "fulfilled"
              ) {

                console.log(
                  `✅ Correo enviado a ${destinatario}`
                );


                console.log(
                  "🆔",
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

              } else {

                console.error(
                  `❌ Error enviando a ${destinatario}:`
                );


                console.error(
                  resultado.reason
                );

              }

            }
          );


          const todosCorrectos =
            resultados.every(
              resultado =>
                resultado.status ===
                "fulfilled"
            );


          if (!todosCorrectos) {

            responder(
              res,
              500,
              {
                ok: false,

                mensaje:
                  "La cita fue recibida, pero uno de los correos no pudo enviarse."
              }
            );

            return;
          }


          responder(
            res,
            200,
            {
              ok: true,

              mensaje:
                "La cita fue registrada y los correos fueron enviados 💛"
            }
          );


        } catch (error) {

          console.error(
            "❌ Error procesando la cita:"
          );


          console.error(
            error
          );


          responder(
            res,
            500,
            {
              ok: false,

              mensaje:
                "Ocurrió un problema al registrar la cita."
            }
          );

        }

        return;
      }


      /*
       * ===============================================
       * 404
       * ===============================================
       */

      responder(
        res,
        404,
        {
          ok: false,
          mensaje:
            "Ruta no encontrada"
        }
      );

    }
  );


/*
 * =========================================================
 * INICIAR SERVIDOR
 * =========================================================
 */

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );


    console.log(
      `💛 Servidor funcionando en puerto ${PORT}`
    );


    console.log(
      `📧 Tu correo: ${MI_EMAIL}`
    );


    console.log(
      `💌 Correo principal: ${PAREJA_EMAIL}`
    );


    console.log(
      `💌 Segundo correo: ${OTRO_EMAIL}`
    );


    console.log(
      `🌐 Aplicación: ${APP_URL}`
    );


    console.log(
      `🖥️ Backend: ${BACKEND_URL}`
    );


    console.log(
      "🔐 Admin token cargado: Sí"
    );


    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );


    console.log("");

  }
);
