import { enviarCorreo } from "./mail.js";

async function enviarInvitacion() {
  try {
    console.log("💌 Enviando invitación...");

    const info = await enviarCorreo(
      process.env.PAREJA_EMAIL,
      "Hay algo especial que se acerca 💛",
      `
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
            <p>💛 Miércoles 30 de septiembre — 6:00 p.m.</p>

            <p>💛 Jueves 1 de octubre — 6:00 p.m.</p>

            <p>💛 Sábado 3 de octubre — 5:00 p.m.</p>
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
            href="http://localhost:4200/login"
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
      `
    );

    console.log("✅ Invitación enviada correctamente");
    console.log("📧 Destinatario:", process.env.PAREJA_EMAIL);
    console.log("🆔 ID:", info.messageId);

  } catch (error) {

    console.error("❌ No se pudo enviar la invitación:");
    console.error(error);

  }
}

enviarInvitacion();
