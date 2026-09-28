import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export function crearClavePuzzle3(secreto = process.env.ADMIN_TOKEN) {
  if (!secreto?.trim()) throw new Error('Falta ADMIN_TOKEN para crear la invitación del Puzzle 3.');
  return createHmac('sha256', secreto.trim()).update('aniversario:puzzle:3:v1').digest('hex');
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().replace(/\s+/g, ' ');
}

function escapar(texto) {
  return texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function errorHttp(status, mensaje) { return Object.assign(new Error(mensaje), { status }); }

async function bodyJSON(req) {
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    throw errorHttp(415, 'Se necesita un cuerpo JSON.');
  }
  const trozos = []; let total = 0;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      limpiar(); req.resume(); reject(errorHttp(408, 'La petición tardó demasiado.'));
    }, 10000);
    const limpiar = () => {
      clearTimeout(timeout);
      req.off('data', datos); req.off('end', fin); req.off('error', fallo); req.off('aborted', abortado);
    };
    const datos = chunk => {
      total += chunk.length;
      if (total > 20000) { limpiar(); req.resume(); reject(errorHttp(413, 'La respuesta es demasiado grande.')); return; }
      trozos.push(chunk);
    };
    const fin = () => { limpiar(); resolve(); };
    const fallo = () => { limpiar(); reject(errorHttp(400, 'No se pudo leer la petición.')); };
    const abortado = () => { limpiar(); reject(errorHttp(400, 'Petición interrumpida.')); };
    req.on('data', datos); req.on('end', fin); req.on('error', fallo); req.on('aborted', abortado);
  });
  try {
    const objeto = JSON.parse(Buffer.concat(trozos).toString('utf8'));
    if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) throw new Error();
    return objeto;
  } catch { throw errorHttp(400, 'El JSON no es válido.'); }
}

function campo(valor, nombre, maximo) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > maximo) {
    throw errorHttp(400, `${nombre}: escribe entre 1 y ${maximo} caracteres.`);
  }
  return valor.trim();
}

/** Instanciar UNA vez. Dependencias inyectables para probar sin enviar correos reales. */
export function crearRutasPuzzle3({
  enviarCorreo,
  carpeta = path.resolve('storage/puzzle3/respuestas'),
  destinatario = process.env.MI_EMAIL?.trim(),
  secreto = process.env.ADMIN_TOKEN,
  libros = process.env.PUZZLE3_LIBROS,
  plazoCorreo = 45000,
  reloj = () => Date.now()
}) {
  const activos = new Map();
  const limites = new Map();
  const claveEsperada = crearClavePuzzle3(secreto);
  const titulos = (libros || '').split('|').map(s => normalizar(s)).filter(Boolean);

  function validarClave(clave) {
    if (typeof clave !== 'string' || !/^[a-f0-9]{64}$/.test(clave)) throw errorHttp(401, 'Abre el juego desde tu invitación por correo.');
    if (!timingSafeEqual(Buffer.from(clave), Buffer.from(claveEsperada))) throw errorHttp(401, 'La invitación no es válida.');
  }

  function limitar(req) {
    const ahora = reloj();
    for (const [ip, valor] of limites) if (valor.hasta < ahora) limites.delete(ip);
    const ip = req.socket.remoteAddress || 'local';
    const entrada = limites.get(ip) || { veces: 0, hasta: ahora + 60000 };
    entrada.veces++;
    limites.set(ip, entrada);
    if (entrada.veces > 80) throw errorHttp(429, 'Espera un minuto antes de volver a intentarlo.');
  }

  function validarLibro(libro) {
    if (!titulos.length || titulos.some(t => t.includes('cambiar'))) {
      throw errorHttp(503, 'David todavía debe configurar el título del libro.');
    }
    if (!titulos.includes(normalizar(libro))) {
      throw errorHttp(422, 'Ese título todavía no abre el recuerdo. Intenta con el nombre del primer libro.');
    }
  }

  function ruta(id) { return path.join(carpeta, `${id}.json`); }
  async function leer(id) {
    try { return JSON.parse(await fs.readFile(ruta(id), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  }
  async function actualizar(registro) {
    const temporal = path.join(carpeta, `${registro.id}.${randomUUID()}.tmp`);
    await fs.writeFile(temporal, JSON.stringify(registro, null, 2), { mode: 0o600 });
    await fs.rename(temporal, ruta(registro.id));
  }
  function salida(registro) {
    const estado = registro.estado;
    return { ok: true, guardado: true, correo: estado,
      mensaje: estado === 'enviado' ? 'Tus respuestas fueron guardadas y aceptadas por Gmail.'
        : estado === 'pendiente' ? 'Tus respuestas están guardadas. El correo está en proceso.'
        : 'Tus respuestas están guardadas. No pudimos confirmar el correo; David puede revisarlas en el servidor.' };
  }

  function lanzar(registro) {
    const tarea = (async () => {
      let temporizador;
      try {
        const html = `<div style="font-family:Arial,sans-serif;background:#161322;color:#eee;padding:28px;border-radius:20px">
          <p style="color:#e8c848;letter-spacing:3px">PUZZLE 03 · TRES MARAVILLAS</p>
          <h1>Ariana encontró los tres ojos 💛</h1>
          ${[
            ['El parque y el lago', 'Lo que siempre quiso decirte el primer día de novios', registro.respuestas.parque],
            ['El mirador', 'Por qué representa un futuro entre ustedes', registro.respuestas.mirador],
            ['La librería de nuestra historia', 'Si nuestra historia fuera un libro, ¿qué te gustaría que pasara en el próximo capítulo?', registro.respuestas.libro]
          ].map(([lugar,pregunta,respuesta]) => `<h2 style="color:#e8c848">${lugar}</h2><p>${pregunta}</p>
            <div style="white-space:pre-wrap;background:#ffffff10;padding:18px;border-radius:12px;line-height:1.8">${escapar(respuesta)}</div>`).join('')}
          <p style="color:#b0b7bd">Registrado: ${escapar(registro.fecha)} · ID: ${registro.id}</p></div>`;
        // La petición HTTP no espera al SMTP. El frontend consulta el mismo envío.
        const envio = Promise.resolve().then(() => enviarCorreo(destinatario, 'Ariana completó las tres maravillas 💛', html));
        const resultado = await Promise.race([
          envio,
          new Promise((_, reject) => { temporizador = setTimeout(() => reject(new Error('SMTP_SIN_CONFIRMACION')), plazoCorreo); })
        ]);
        if (!resultado?.accepted?.length || resultado?.rejected?.length) throw new Error('SMTP_RECHAZADO');
        registro.estado = 'enviado';
        registro.messageId = String(resultado.messageId || '');
      } catch {
        // Nunca reenvía automáticamente tras un timeout: el proveedor pudo aceptarlo.
        registro.estado = 'sin_confirmar';
      } finally {
        clearTimeout(temporizador);
        try { await actualizar(registro); }
        catch { console.error('Puzzle 3: no se pudo actualizar el estado del correo. Las respuestas ya están guardadas.'); }
        activos.delete(registro.id);
      }
    })();
    activos.set(registro.id, tarea);
  }

  return async function manejarPuzzle3(req, res, responder) {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (!['/api/puzzle3/validar-libro', '/api/puzzle3/completar'].includes(pathname)) return false;
    try {
      if (req.method !== 'POST') throw errorHttp(405, 'Usa POST.');
      limitar(req);
      const datos = await bodyJSON(req);
      validarClave(datos.clave);

      const libro = campo(
        datos.libro,
        'La librería',
        2000
      );
      if (pathname.endsWith('/validar-libro')) {
        responder(res, 200, { ok: true }); return true;
      }
      if (!destinatario) throw errorHttp(503, 'Falta MI_EMAIL en el servidor.');
      const id = datos.id;
      if (typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) throw errorHttp(400, 'Identificador de partida inválido.');
      const respuestas = { parque: campo(datos.parque, 'Parque', 2000), mirador: campo(datos.mirador, 'Mirador', 2000), libro };
      const huella = createHash('sha256').update(JSON.stringify(respuestas)).digest('hex');
      await fs.mkdir(carpeta, { recursive: true });
      let registro = await leer(id);
      if (!registro) {
        registro = { id, fecha: new Date(reloj()).toISOString(), respuestas, huella, estado: 'pendiente' };
        try {
          // Publica un archivo COMPLETO de forma exclusiva. El hard link no sobrescribe otro ID.
          const temporal = path.join(carpeta, `${id}.${randomUUID()}.tmp`);
          try {
            await fs.writeFile(temporal, JSON.stringify(registro, null, 2), { mode: 0o600 });
            await fs.link(temporal, ruta(id));
          } finally { await fs.unlink(temporal).catch(() => {}); }
          lanzar(registro);
        } catch (e) {
          if (e.code !== 'EEXIST') throw e;
          // La otra petición puede estar terminando la escritura: responder 202 sin reenviar.
          responder(res, 202, { ok: true, guardado: false, correo: 'pendiente', mensaje: 'Confirmando el registro…' });
          return true;
        }
      }
      if (registro.huella !== huella) throw errorHttp(409, 'Esta partida ya tiene otras respuestas guardadas.');
      // Si Node se reinició mientras enviaba, no vuelve a mandar el correo a ciegas.
      if (registro.estado === 'pendiente' && !activos.has(id)) {
        registro.estado = 'sin_confirmar';
        await actualizar(registro);
      }
      responder(res, registro.estado === 'pendiente' ? 202 : 200, salida(registro));
    } catch (error) {
      if (!res.destroyed && !res.writableEnded) {
        responder(res, error.status || 500, { ok: false,
          mensaje: error.status ? error.message : 'No se pudieron registrar las respuestas. Intenta nuevamente.' });
      }
    }
    return true;
  };
}
