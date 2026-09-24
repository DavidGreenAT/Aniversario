export function obtenerPuzzle(numero, appUrl) {

  if (!appUrl) {
    throw new Error("APP_URL no está definida.");
  }

  const urlBase = appUrl.replace(/\/$/, "");

  const puzzles = {

    1: {
      asunto: "Una pequeña pista para ti 💛",
      titulo: "Puzzle #1",
      emoji: "🧩",

      mensaje: `
        El camino hacia nuestra fecha especial acaba de comenzar.

        Tengo una pequeña prueba para ti. No será difícil...

        Pero tendrás que recordar algunos momentos de nosotros. 💛
      `,

      boton: "Descubrir el primer puzzle",

      url: `${urlBase}/puzzle/1`
    },


    2: {
      asunto: "¿Lista para la segunda pista? 💌",
      titulo: "Puzzle #2",
      emoji: "🔐",

      mensaje: `
        Superaste la primera prueba, pero todavía quedan algunas cosas por descubrir.

        Esta vez tendrás que pensar un poquito más...

        Cada respuesta te acercará un poco más a nuestra fecha especial. 💕
      `,

      boton: "Resolver el segundo puzzle",

      url: `${urlBase}/puzzle/2`
    },


    3: {
      asunto: "Cada vez estamos más cerca ✨",
      titulo: "Puzzle #3",
      emoji: "💫",

      mensaje: `
        Ya estamos muy cerca de nuestra fecha.

        Esta pista guarda algo especial sobre nosotros.

        Espero que recuerdes bien algunos de nuestros momentos... 👀
      `,

      boton: "Abrir el tercer puzzle",

      url: `${urlBase}/puzzle/3`
    },


    4: {
      asunto: "La última pista antes de nuestro día 💛",
      titulo: "Puzzle #4",
      emoji: "💛",

      mensaje: `
        Llegaste hasta aquí.

        Esta es la última prueba antes de que llegue nuestro día.

        Después de resolverla, solamente tendrás que esperar...

        Lo demás será una sorpresa. ♡
      `,

      boton: "Resolver el último puzzle",

      url: `${urlBase}/puzzle/4`
    }

  };

  return puzzles[numero] || null;
}


/**
 * Escapamos texto por seguridad antes de insertarlo
 * dentro del HTML.
 */
function escaparHTML(texto = "") {

  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/**
 * =========================================================
 * GENERAR HTML DEL CORREO
 * =========================================================
 */

export function generarCorreoPuzzle(puzzle) {

  if (!puzzle) {
    throw new Error("El puzzle recibido no existe.");
  }

  const mensajeHTML = puzzle.mensaje
    .trim()
    .split("\n")
    .map(linea => linea.trim())
    .filter(linea => linea.length > 0)
    .map(linea => `
      <p style="
        margin: 0 0 16px;
        font-size: 16px;
        color: #666666;
        line-height: 1.8;
      ">
        ${escaparHTML(linea)}
      </p>
    `)
    .join("");


  return `
    <!DOCTYPE html>

    <html lang="es">

      <body style="
        margin:0;
        padding:0;
        background-color:#fffaf5;
      ">

        <div style="
          width:100%;
          margin:0;
          padding:40px 20px;
          box-sizing:border-box;
          background-color:#fffaf5;
          font-family:Arial,Helvetica,sans-serif;
          color:#333333;
        ">

          <div style="
            max-width:600px;
            margin:0 auto;
            background:#ffffff;
            border-radius:24px;
            padding:45px 35px;
            box-sizing:border-box;
            text-align:center;
            box-shadow:0 10px 30px rgba(0,0,0,.08);
          ">

            <!-- Emoji -->

            <div style="
              font-size:48px;
              margin-bottom:12px;
            ">
              ${puzzle.emoji}
            </div>


            <!-- Título -->

            <h1 style="
              margin:0 0 25px;
              color:#e85d75;
              font-size:28px;
              line-height:1.3;
            ">
              ${escaparHTML(puzzle.titulo)}
            </h1>


            <!-- Mensaje -->

            <div style="
              margin-top:20px;
            ">
              ${mensajeHTML}
            </div>


            <!-- Caja de misterio -->

            <div style="
              margin:30px 0;
              padding:20px;
              background:#fff8df;
              border:1px solid #f4df93;
              border-radius:16px;
            ">

              <p style="
                margin:0;
                color:#6b5817;
                font-size:15px;
                line-height:1.7;
              ">
                ✨ Tómate tu tiempo, piensa bien tu respuesta
                y disfruta cada parte de esta pequeña aventura.
              </p>

            </div>


            <!-- Botón -->

            <a
              href="${puzzle.url}"
              target="_blank"
              style="
                display:inline-block;
                margin-top:5px;
                padding:16px 30px;
                background:#f2cf5b;
                color:#222222;
                text-decoration:none;
                border-radius:30px;
                font-weight:bold;
                font-size:16px;
              "
            >
              ${escaparHTML(puzzle.boton)} 💛
            </a>


            <!-- Separador -->

            <div style="
              width:60px;
              height:2px;
              background:#e8c75a;
              margin:35px auto;
            "></div>


            <!-- Final -->

            <p style="
              margin:0;
              font-size:18px;
              color:#444444;
              line-height:1.6;
            ">
              Te amo infinitamente.
            </p>

            <p style="
              margin:10px 0 0;
              font-size:28px;
            ">
              ♡
            </p>

          </div>


          <p style="
            margin:25px 0 0;
            text-align:center;
            color:#aaaaaa;
            font-size:12px;
          ">
            Hecho especialmente para ti.
          </p>

        </div>

      </body>

    </html>
  `;
}
