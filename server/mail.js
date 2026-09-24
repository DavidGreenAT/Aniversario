import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function enviarCorreo(destinatario, asunto, mensaje) {
  const resultado = await transporter.sendMail({
    from: `"Nuestra cita 💛" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    html: mensaje,
  });

  return resultado;
}
