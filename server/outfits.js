import Busboy from "busboy";

import fs from "node:fs/promises";

import path from "node:path";

import sharp from "sharp";


/*
 * =========================================================
 * CONFIGURACIÓN
 * =========================================================
 */

const MAX_ARCHIVOS = 15;

const MAX_FILE_SIZE =
  8 * 1024 * 1024;


const MIME_PERMITIDOS = [
  "image/png",
  "image/jpeg"
];


const EXTENSIONES_PERMITIDAS = [
  ".png",
  ".jpg",
  ".jpeg"
];


const MODELO =
  "@cf/black-forest-labs/flux-2-klein-4b";

const CARPETA_OUTFITS_GENERADOS =
  path.join(
    process.cwd(),
    "storage",
    "outfits",
    "generados"
  );

const BACKEND_URL =
  process.env.BACKEND_URL?.trim() ||
  "http://localhost:3000";

/*
 * =========================================================
 * PREPARAR CARPETA DE OUTFITS GENERADOS
 * =========================================================
 */

async function prepararCarpetaOutfits() {

  await fs.mkdir(
    CARPETA_OUTFITS_GENERADOS,
    {
      recursive: true
    }
  );

}

/*
 * =========================================================
 * VALIDAR ARCHIVOS
 * =========================================================
 */

function extensionPermitida(
  filename = ""
) {

  const extension =
    path
      .extname(filename)
      .toLowerCase();


  return EXTENSIONES_PERMITIDAS
    .includes(extension);
}


/*
 * =========================================================
 * LEER IMÁGENES RECIBIDAS DESDE ANGULAR
 * =========================================================
 */

function leerImagenes(req) {

  return new Promise(
    (resolve, reject) => {

      const archivos = [];

      let errorLectura = null;


      const busboy =
        Busboy({

          headers:
            req.headers,

          limits: {

            files:
              MAX_ARCHIVOS,

            fileSize:
              MAX_FILE_SIZE

          }

        });


      busboy.on(
        "file",

        (
          categoria,
          file,
          info
        ) => {

          const {

            filename = "",

            mimeType = ""

          } = info;


          console.log("");
          console.log(
            "📥 Archivo recibido:"
          );

          console.log(
            "   Categoría:",
            categoria
          );

          console.log(
            "   Nombre:",
            filename
          );

          console.log(
            "   MIME:",
            mimeType
          );


          /*
           * Validar extensión
           */

          if (
            !extensionPermitida(
              filename
            )
          ) {

            console.warn(
              `⚠️ Formato ignorado: ${filename}`
            );

            file.resume();

            return;
          }


          /*
           * JPG y JPEG llegan como image/jpeg
           */

          if (
            !MIME_PERMITIDOS.includes(
              mimeType
            )
          ) {

            console.warn(
              `⚠️ MIME no permitido: ${mimeType}`
            );

            file.resume();

            return;
          }


          const chunks = [];

          let excedido = false;


          file.on(
            "data",
            chunk => {

              if (!excedido) {

                chunks.push(
                  chunk
                );

              }

            }
          );


          file.on(
            "limit",
            () => {

              excedido = true;

              errorLectura =
                new Error(
                  `"${filename}" supera 8 MB.`
                );

            }
          );


          file.on(
            "end",
            () => {

              if (
                excedido
              ) {

                return;

              }


              const buffer =
                Buffer.concat(
                  chunks
                );


              if (
                buffer.length === 0
              ) {

                return;

              }


              archivos.push({

                categoria,

                filename,

                mimeType,

                buffer

              });


              console.log(
                `✅ Imagen aceptada: ${filename}`
              );

            }
          );

        }
      );


      busboy.on(
        "filesLimit",
        () => {

          errorLectura =
            new Error(
              `Máximo ${MAX_ARCHIVOS} imágenes.`
            );

        }
      );


      busboy.on(
        "error",
        error => {

          reject(error);

        }
      );


      busboy.on(
        "finish",
        () => {

          if (
            errorLectura
          ) {

            reject(
              errorLectura
            );

            return;
          }


          console.log("");
          console.log(
            `📷 Imágenes recibidas: ${archivos.length}`
          );


          resolve(
            archivos
          );

        }
      );


      req.pipe(
        busboy
      );

    }
  );
}


/*
 * =========================================================
 * BUSCAR CORALINE
 * =========================================================
 */

async function buscarCoraline() {

  const carpeta =
    path.join(
      process.cwd(),
      "public",
      "img"
    );


  const nombres = [

    "coraline.png",

    "coraline.jpg",

    "coraline.jpeg"

  ];


  for (
    const nombre
    of nombres
  ) {

    const ruta =
      path.join(
        carpeta,
        nombre
      );


    try {

      await fs.access(
        ruta
      );


      console.log(
        "✅ Referencia visual encontrada:"
      );

      console.log(
        ruta
      );


      return ruta;

    } catch {

      // Continuamos buscando

    }

  }


  throw new Error(
    "No encontré coraline.png, coraline.jpg ni coraline.jpeg en public/img."
  );
}


/*
 * =========================================================
 * PREPARAR CORALINE
 * =========================================================
 */

async function prepararCoraline() {

  const ruta =
    await buscarCoraline();


  /*
   * Cloudflare exige referencias
   * menores de 512x512.
   *
   * Usamos 500x500.
   */

  return sharp(
    ruta
  )
    .resize(
      500,
      500,
      {
        fit:
          "contain",

        background:
          "#111116",

        withoutEnlargement:
          true
      }
    )
    .png()
    .toBuffer();
}


/*
 * =========================================================
 * CREAR COLLAGE
 * =========================================================
 */

async function crearCollage(
  prendas
) {

  if (
    prendas.length === 0
  ) {

    return null;

  }


  /*
   * Máximo 6 imágenes
   * por collage.
   */

  const seleccionadas =
    prendas.slice(
      0,
      6
    );


  /*
   * 1 imagen = 1 columna
   * 2-4 = 2 columnas
   * 5-6 = 3 columnas
   */

  let columnas = 1;


  if (
    seleccionadas.length >= 2
  ) {

    columnas = 2;

  }


  if (
    seleccionadas.length >= 5
  ) {

    columnas = 3;

  }


  const filas =
    Math.ceil(
      seleccionadas.length /
      columnas
    );


  const ancho =
    500;

  const alto =
    500;


  const espacio =
    8;


  const anchoCelda =
    Math.floor(
      ancho /
      columnas
    );


  const altoCelda =
    Math.floor(
      alto /
      filas
    );


  const composites = [];


  for (
    let i = 0;
    i < seleccionadas.length;
    i++
  ) {

    const prenda =
      seleccionadas[i];


    const columna =
      i % columnas;


    const fila =
      Math.floor(
        i /
        columnas
      );


    /*
     * Convertimos cada prenda
     * a PNG.
     */

    const imagen =
      await sharp(
        prenda.buffer
      )
        .rotate()
        .resize(

          anchoCelda -
            espacio * 2,

          altoCelda -
            espacio * 2,

          {
            fit:
              "contain",

            background:
              "#f4f4f4"
          }

        )
        .flatten({
          background:
            "#f4f4f4"
        })
        .png()
        .toBuffer();


    composites.push({

      input:
        imagen,

      left:
        columna *
          anchoCelda +
        espacio,

      top:
        fila *
          altoCelda +
        espacio

    });

  }


  /*
   * Fondo del collage
   */

  return sharp({

    create: {

      width:
        ancho,

      height:
        alto,

      channels:
        3,

      background:
        "#f4f4f4"

    }

  })
    .composite(
      composites
    )
    .png()
    .toBuffer();
}


/*
 * =========================================================
 * PREPARAR REFERENCIAS
 * =========================================================
 */

async function prepararReferencias(
  prendas
) {

  const blusas =
    prendas.filter(
      prenda =>
        prenda.categoria ===
        "blusas"
    );


  const pantalones =
    prendas.filter(
      prenda =>
        prenda.categoria ===
        "pantalones"
    );


  const zapatosAccesorios =
    prendas.filter(
      prenda =>
        prenda.categoria ===
          "zapatos" ||
        prenda.categoria ===
          "accesorios"
    );


  const collageBlusas =
    await crearCollage(
      blusas
    );


  const collagePantalones =
    await crearCollage(
      pantalones
    );


  const collageComplementos =
    await crearCollage(
      zapatosAccesorios
    );


  const referencias = [];


  if (collageBlusas) {

    referencias.push({
      nombre:
        "Available tops",
      buffer:
        collageBlusas
    });

  }


  if (collagePantalones) {

    referencias.push({
      nombre:
        "Available bottoms",
      buffer:
        collagePantalones
    });

  }


  if (collageComplementos) {

    referencias.push({
      nombre:
        "Available shoes and accessories",
      buffer:
        collageComplementos
    });

  }


  return referencias;
}


/*
 * =========================================================
 * PROMPT
 * =========================================================
 */

function crearPrompt(
  variante,
  referencias
) {

  const descripcionReferencias =
    referencias
      .map(
        (
          referencia,
          index
        ) =>
          `Image ${index}: ${referencia.nombre}`
      )
      .join("\n");


  return `
Create a tasteful full-body fashion visualization of an ADULT WOMAN age 25 or older.

REFERENCE IMAGES:

${descripcionReferencias}

All reference images contain real clothing available in a personal wardrobe.

Use ONLY garments, shoes and accessories that are clearly visible in the supplied reference images.

Preserve the selected garments as accurately as possible:

- original color
- fabric appearance
- pattern
- sleeves
- shape
- length
- footwear
- accessories

Do not invent logos.
Do not invent text.
Do not replace the uploaded garments with unrelated clothing.

Create a coherent and realistic outfit combination.

PERSON:

- clearly an adult woman age 25+
- full body
- standing naturally
- tasteful fashion presentation
- non-sexualized pose
- normal proportions

VISUAL STYLE:

Create a whimsical handcrafted stop-motion dark-fantasy aesthetic.

Use this color atmosphere:

- warm yellow #e8c848
- dark yellow #d1b22a
- electric blue #005cbf
- turquoise #4db0c6
- fog gray #b0b7bd
- deep purple #2b1b60
- near black #111116
- muted magenta #652f5f
- rust orange #e29a36
- subtle green #a3c139

Use blue hair as a visual accent.

Do not recreate or imitate any specific copyrighted character.

OUTFIT DIRECTION:

${variante}

FINAL IMAGE:

- vertical fashion portrait
- adult woman
- head-to-toe view
- complete outfit visible
- shoes visible
- tasteful
- non-sexualized
- cinematic lighting
- handcrafted stop-motion atmosphere
- no captions
- no text
- no collage
  `.trim();
}


/*
 * =========================================================
 * LLAMAR A CLOUDFLARE
 * =========================================================
 */

async function generarImagenCloudflare(
  prompt,
  referencias,
  numero
) {

  const accountId =
    process.env
      .CLOUDFLARE_ACCOUNT_ID
      ?.trim();


  const apiToken =
    process.env
      .CLOUDFLARE_API_TOKEN
      ?.trim();


  if (!accountId) {

    throw new Error(
      "Falta CLOUDFLARE_ACCOUNT_ID en .env."
    );

  }


  if (!apiToken) {

    throw new Error(
      "Falta CLOUDFLARE_API_TOKEN en .env."
    );

  }


  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODELO}`;


  const form =
    new FormData();


  form.append(
    "prompt",
    prompt
  );


  form.append(
    "width",
    "768"
  );


  form.append(
    "height",
    "1024"
  );


  form.append(
    "guidance",
    "4"
  );


  /*
   * ===============================================
   * IMÁGENES DE REFERENCIA
   * ===============================================
   */

  referencias.forEach(
    (
      referencia,
      index
    ) => {

      const blob =
        new Blob(
          [
            referencia.buffer
          ],
          {
            type:
              "image/png"
          }
        );


      form.append(
        `input_image_${index}`,
        blob,
        `referencia-${index}.png`
      );

    }
  );


  console.log(
    `☁️ Enviando ${referencias.length} referencias a Cloudflare...`
  );


  const response =
    await fetch(
      endpoint,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiToken}`
        },

        body:
          form
      }
    );


  const texto =
    await response.text();


  let data;


  try {

    data =
      JSON.parse(
        texto
      );

  } catch {

    throw new Error(
      `Cloudflare devolvió una respuesta inesperada: ${texto.slice(0, 500)}`
    );

  }


  /*
   * ===============================================
   * ERROR CLOUDFLARE
   * ===============================================
   */

  if (!response.ok) {

    console.error(
      "❌ Respuesta Cloudflare:",
      data
    );


    const mensaje =
      data
        ?.errors?.[0]
        ?.message ||
      data
        ?.message ||
      `Cloudflare respondió HTTP ${response.status}`;


    throw new Error(
      mensaje
    );

  }


  /*
   * ===============================================
   * OBTENER BASE64
   * ===============================================
   */

  let base64 =
    data
      ?.result
      ?.image;


  if (
    !base64 &&
    typeof data?.result ===
      "string"
  ) {

    base64 =
      data.result;

  }


  if (
    !base64 &&
    typeof data?.image ===
      "string"
  ) {

    base64 =
      data.image;

  }


  if (!base64) {

    console.error(
      "Respuesta completa:",
      data
    );


    throw new Error(
      `Cloudflare no devolvió la imagen del outfit ${numero}.`
    );

  }


  /*
   * ===============================================
   * LIMPIAR DATA URL SI VINIERA INCLUIDA
   * ===============================================
   */

  if (
    base64.includes(",")
  ) {

    base64 =
      base64.split(",")[1];

  }


  /*
   * ===============================================
   * CONVERTIR BASE64 A BUFFER
   * ===============================================
   */

  const bufferImagen =
    Buffer.from(
      base64,
      "base64"
    );


  if (
    bufferImagen.length === 0
  ) {

    throw new Error(
      `El outfit ${numero} llegó vacío.`
    );

  }


  /*
   * ===============================================
   * CREAR CARPETA
   * ===============================================
   */

  await prepararCarpetaOutfits();


  /*
   * ===============================================
   * NOMBRE ÚNICO
   * ===============================================
   */

  const nombreArchivo =
    `outfit-${Date.now()}-${numero}.png`;


  const rutaArchivo =
    path.join(
      CARPETA_OUTFITS_GENERADOS,
      nombreArchivo
    );


  /*
   * ===============================================
   * GUARDAR EN DISCO
   * ===============================================
   */

  await fs.writeFile(
    rutaArchivo,
    bufferImagen
  );


  console.log(
    `💾 Outfit ${numero} guardado:`
  );

  console.log(
    rutaArchivo
  );


  /*
   * ===============================================
   * URL PARA ANGULAR
   * ===============================================
   */

  const urlPublica =
    `${BACKEND_URL}/media/outfits/generados/${nombreArchivo}`;


  console.log(
    `🌐 URL: ${urlPublica}`
  );


  return urlPublica;
}


/*
 * =========================================================
 * GENERAR UN OUTFIT
 * =========================================================
 */

async function generarOutfit(
  variante,
  prendas,
  numero
) {

  console.log("");
  console.log(
    `🎨 Generando outfit ${numero}/3...`
  );


  const referencias =
    await prepararReferencias(
      prendas
    );


  console.log(
    `📸 Referencias creadas: ${referencias.length}`
  );


  referencias.forEach(
    (
      referencia,
      index
    ) => {

      console.log(
        `   Imagen ${index}: ${referencia.nombre}`
      );

    }
  );


  const prompt =
    crearPrompt(
      variante,
      referencias
    );


  const imagen =
    await generarImagenCloudflare(
      prompt,
      referencias,
      numero
    );


  console.log(
    `✅ Outfit ${numero} generado`
  );


  return imagen;
}


/*
 * =========================================================
 * FUNCIÓN PRINCIPAL
 * =========================================================
 */

export async function
generarOutfitsDesdeRequest(
  req
) {

  /*
   * Validar variables
   */

  if (
    !process.env
      .CLOUDFLARE_ACCOUNT_ID
  ) {

    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID no está configurada."
    );

  }


  if (
    !process.env
      .CLOUDFLARE_API_TOKEN
  ) {

    throw new Error(
      "CLOUDFLARE_API_TOKEN no está configurada."
    );

  }


  /*
   * Recibir ropa
   */

  const prendas =
    await leerImagenes(
      req
    );


  if (
    prendas.length < 2
  ) {

    throw new Error(
      "Sube al menos dos prendas PNG, JPG o JPEG."
    );

  }


  console.log("");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  console.log(
    `👗 Closet recibido: ${prendas.length} prendas`
  );

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );


  /*
   * Tres propuestas diferentes.
   */

  const variantes = [

    `
Romantic and relaxed anniversary date outfit.

Comfortable, youthful and romantic.

Use a balanced combination of the uploaded wardrobe.
    `.trim(),


    `
Casual-elegant anniversary outfit.

Modern, polished and feminine without looking excessively formal.

Use a different combination from the first outfit whenever possible.
    `.trim(),


    `
Playful alternative anniversary outfit.

Creative, youthful and stylish.

Use another combination from the wardrobe and give it more personality while remaining wearable.
    `.trim()

  ];


  /*
   * Generamos secuencialmente
   * para evitar tres requests
   * simultáneos.
   */

  const imagenes = [];


  for (
    let i = 0;
    i < variantes.length;
    i++
  ) {

    const imagen =
      await generarOutfit(

        variantes[i],

        prendas,

        i + 1

      );


    imagenes.push(
      imagen
    );

  }


  console.log("");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  console.log(
    "✨ 3 outfits generados correctamente"
  );

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );


  return imagenes;
}
