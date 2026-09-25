import "dotenv/config";

import http from "node:http";
import { google } from "googleapis";

const CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID?.trim();

const CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET?.trim();

const REDIRECT_URI =
  "http://localhost:3001/oauth2callback";


if (!CLIENT_ID) {
  console.error("❌ Falta GOOGLE_CLIENT_ID");
  process.exit(1);
}

if (!CLIENT_SECRET) {
  console.error("❌ Falta GOOGLE_CLIENT_SECRET");
  process.exit(1);
}


const oauth2Client =
  new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );


const authUrl =
  oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",

    scope: [
      "https://www.googleapis.com/auth/gmail.send"
    ]
  });


console.log("");
console.log("🔐 Abre esta URL:");
console.log("");
console.log(authUrl);
console.log("");


const server =
  http.createServer(
    async (req, res) => {

      try {

        const url =
          new URL(
            req.url,
            REDIRECT_URI
          );


        if (
          url.pathname !==
          "/oauth2callback"
        ) {

          res.writeHead(404);
          res.end("Ruta no encontrada");

          return;
        }


        const code =
          url.searchParams.get("code");


        if (!code) {

          throw new Error(
            "No se recibió código OAuth."
          );

        }


        const { tokens } =
          await oauth2Client.getToken(
            code
          );


        console.log("");
        console.log("✅ AUTORIZACIÓN CORRECTA");
        console.log("");


        if (
          tokens.refresh_token
        ) {

          console.log(
            "GOOGLE_REFRESH_TOKEN="
            + tokens.refresh_token
          );

        } else {

          console.log(
            "⚠️ Google no devolvió refresh_token."
          );

        }


        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8"
          }
        );


        res.end(`
          <h1>✅ Gmail autorizado</h1>
          <p>Puedes cerrar esta ventana.</p>
        `);


        setTimeout(
          () => server.close(),
          1000
        );

      } catch (error) {

        console.error(
          "❌ Error OAuth:",
          error
        );


        res.writeHead(500);
        res.end(
          "Error autorizando Gmail."
        );

      }

    }
  );


server.listen(
  3001,
  "127.0.0.1",
  () => {

    console.log(
      "Esperando autorización en:"
    );

    console.log(
      REDIRECT_URI
    );

  }
);
