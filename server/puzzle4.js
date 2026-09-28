import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual
} from "node:crypto";

import fs from "node:fs/promises";
import path from "node:path";

export function crearClavePuzzle4(
  secreto = process.env.ADMIN_TOKEN
) {
  if (!secreto?.trim()) {
    throw new Error("Falta ADMIN_TOKEN para el Puzzle 4.");
  }

  return createHmac("sha256", secreto.trim())
    .update("aniversario:puzzle:4:v1")
    .digest("hex");
}

function escapar(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fallo(status, mensaje) {
  return Object.assign(new Error(mensaje), { status });
}

async function leerJSON(req) {
  if (
    !String(req.headers["content-type"] || "")
      .includes("application/json")
  ) {
    throw fallo(415, "La petición debe contener JSON.");
  }

  const partes = [];
  let total = 0;

  await new Promise((resolve, reject) => {
    const limpiar = () => {
      clearTimeout(temporizador);
      req.off("data", recibir);
      req.off("end", terminar);
      req.off("error", interrumpir);
      req.off("aborted", interrumpir);
    };

    const recibir = parte => {
      total += parte.length;

      if (total > 40000) {
        limpiar();
        req.resume();
        reject(fallo(413, "Las respuestas son demasiado grandes."));
        return;
      }

      partes.push(parte);
    };

    const terminar = () => {
      limpiar();
      resolve();
    };

    const interrumpir = () => {
      limpiar();
      reject(fallo(400, "La petición se interrumpió."));
    };

    const temporizador = setTimeout(() => {
      limpiar();
      req.resume();
      reject(fallo(408, "La petición tardó demasiado."));
    }, 10000);

    req.on("data", recibir);
    req.on("end", terminar);
    req.on("error", interrumpir);
    req.on("aborted", interrumpir);
  });

  try {
    const datos = JSON.parse(
      Buffer.concat(partes).toString("utf8")
    );

    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
      throw new Error();
    }

    return datos;
  } catch {
    throw fallo(400, "El JSON no es válido.");
  }
}

function respuestaLibre(valor, nombre) {
  if (
    typeof valor !== "string" ||
    !valor.trim() ||
    valor.trim().length > 2000
  ) {
    throw fallo(
      400,
      `${nombre}: escribe entre 1 y 2,000 caracteres.`
    );
  }

  return valor.trim();
}

export function crearRutasPuzzle4({
  enviarCorreo,
  destinatario = process.env.MI_EMAIL?.trim(),
  secreto = process.env.ADMIN_TOKEN,
  carpeta = path.resolve("storage/puzzle4/respuestas")
}) {
  const claveEsperada = crearClavePuzzle4(secreto);
  const activos = new Set();
  const limites = new Map();

  const ruta = id => path.join(carpeta, `${id}.json`);

  async function leer(id) {
    try {
      return JSON.parse(await fs.readFile(ruta(id), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async function actualizar(registro) {
    const temporal = path.join(
      carpeta,
      `${registro.id}.${randomUUID()}.tmp`
    );

    try {
      await fs.writeFile(
        temporal,
        JSON.stringify(registro, null, 2),
        { mode: 0o600 }
      );

      await fs.rename(temporal, ruta(registro.id));
    } finally {
      await fs.unlink(temporal).catch(() => {});
    }
  }

  async function mandar(registro) {
    let temporizador;

    try {
      const preguntas = [
        [
          "Lo que hemos vivido",
          "¿Qué recuerdo de nosotros guardarías para siempre?",
          registro.respuestas.recuerdo
        ],
        [
          "Lo que soñamos",
          "¿Qué sueño te gustaría que cumplamos juntos?",
          registro.respuestas.sueno
        ],
        [
          "Lo que queremos cuidar",
          "¿Qué pequeña cosa de nuestra relación te gustaría que nunca perdiéramos?",
          registro.respuestas.cuidado
        ]
      ];

      const contenido = preguntas.map(
        ([titulo, pregunta, respuesta]) => `
          <h2 style="color:#8b6724">${escapar(titulo)}</h2>
          <p>${escapar(pregunta)}</p>
          <div style="
            white-space:pre-wrap;
            background:#fff2ce;
            padding:20px;
            border-radius:14px;
            line-height:1.8;
          ">${escapar(respuesta)}</div>
        `
      ).join("");

      const html = `
        <div style="
          font-family:Arial,sans-serif;
          background:#fff9eb;
          color:#3c2d36;
          padding:30px;
        ">
          <p>PUZZLE 04 · NUESTRO ANIVERSARIO</p>
          <h1>Ariana abrió el próximo capítulo 💛</h1>
          <p>Estas son sus palabras al terminar la aventura.</p>

          ${contenido}

          <p style="margin-top:30px;color:#81757c">
            Registrado: ${escapar(registro.fecha)}
          </p>
        </div>
      `;

      const resultado = await Promise.race([
        Promise.resolve().then(() =>
          enviarCorreo(
            destinatario,
            "Ariana abrió nuestra última puerta 💛",
            html
          )
        ),
        new Promise((_, reject) => {
          temporizador = setTimeout(
            () => reject(new Error("ENVIO_SIN_CONFIRMACION")),
            45000
          );
        })
      ]);

      if (
        !resultado?.accepted?.length ||
        resultado?.rejected?.length
      ) {
        throw new Error("CORREO_NO_CONFIRMADO");
      }

      registro.estado = "enviado";
      registro.messageId = String(resultado.messageId || "");
    } catch {
      registro.estado = "sin_confirmar";

      console.error(
        "Puzzle 4: no se confirmó el correo; las respuestas están guardadas.",
        registro.id
      );
    } finally {
      clearTimeout(temporizador);

      try {
        await actualizar(registro);
      } catch {
        console.error(
          "Puzzle 4: no se pudo actualizar el estado del envío.",
          registro.id
        );
      }

      activos.delete(registro.id);
    }
  }

  return async function manejarPuzzle4(req, res, responder) {
    const pathname = new URL(
      req.url || "/",
      "http://localhost"
    ).pathname;

    if (pathname !== "/api/puzzle4/completar") {
      return false;
    }

    try {
      if (req.method !== "POST") {
        throw fallo(405, "Usa POST.");
      }

      const ahora = Date.now();

      for (const [ip, limite] of limites) {
        if (limite.hasta < ahora) {
          limites.delete(ip);
        }
      }

      const ip = req.socket.remoteAddress || "local";
      const limite = limites.get(ip) || {
        veces: 0,
        hasta: ahora + 60000
      };

      limite.veces++;
      limites.set(ip, limite);

      if (limite.veces > 80) {
        throw fallo(429, "Espera un minuto e inténtalo otra vez.");
      }

      const datos = await leerJSON(req);

      if (
        typeof datos.clave !== "string" ||
        !/^[a-f0-9]{64}$/.test(datos.clave) ||
        !timingSafeEqual(
          Buffer.from(datos.clave),
          Buffer.from(claveEsperada)
        )
      ) {
        throw fallo(
          401,
          "Abre el Puzzle 4 desde su invitación por correo."
        );
      }

      if (!destinatario) {
        throw fallo(503, "Falta MI_EMAIL en el servidor.");
      }

      if (
        typeof datos.id !== "string" ||
        !/^[a-f0-9]{32}$/.test(datos.id)
      ) {
        throw fallo(400, "La partida no es válida.");
      }

      const respuestas = {
        recuerdo: respuestaLibre(datos.recuerdo, "Recuerdo"),
        sueno: respuestaLibre(datos.sueno, "Sueño"),
        cuidado: respuestaLibre(datos.cuidado, "Cuidado")
      };

      const huella = createHash("sha256")
        .update(JSON.stringify(respuestas))
        .digest("hex");

      await fs.mkdir(carpeta, { recursive: true });

      let registro = await leer(datos.id);

      if (!registro) {
        registro = {
          id: datos.id,
          fecha: new Date().toISOString(),
          respuestas,
          huella,
          estado: "pendiente"
        };

        const temporal = path.join(
          carpeta,
          `${datos.id}.${randomUUID()}.tmp`
        );

        try {
          await fs.writeFile(
            temporal,
            JSON.stringify(registro, null, 2),
            { mode: 0o600 }
          );

          // Publica el archivo completo sin sobrescribir otra partida.
          await fs.link(temporal, ruta(datos.id));

          activos.add(datos.id);
          void mandar(registro);
        } catch (error) {
          if (error.code !== "EEXIST") {
            throw error;
          }

          responder(res, 202, {
            ok: true,
            guardado: false,
            correo: "pendiente",
            mensaje: "Confirmando el registro."
          });

          return true;
        } finally {
          await fs.unlink(temporal).catch(() => {});
        }
      }

      if (registro.huella !== huella) {
        throw fallo(
          409,
          "Esta partida ya tiene otras respuestas registradas."
        );
      }

      // Si el servidor se reinició, no repite un envío incierto.
      if (
        registro.estado === "pendiente" &&
        !activos.has(registro.id)
      ) {
        registro.estado = "sin_confirmar";
        await actualizar(registro);
      }

      responder(
        res,
        registro.estado === "pendiente" ? 202 : 200,
        {
          ok: true,
          guardado: true,
          correo: registro.estado
        }
      );
    } catch (error) {
      if (!res.destroyed && !res.writableEnded) {
        responder(res, error.status || 500, {
          ok: false,
          mensaje: error.status
            ? error.message
            : "No se pudieron guardar las respuestas."
        });
      }
    }

    return true;
  };
}
