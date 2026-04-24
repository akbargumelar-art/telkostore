import nodemailer from "nodemailer";

function createLocalFallbackTransport() {
  return nodemailer.createTransport({
    host: "127.0.0.1",
    port: 25,
    secure: false,
    ignoreTLS: true,
  });
}

export async function sendEmail({ to, subject, html, text, attachments = [] }) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"Telko.Store" <info@telko.store>';

  if (!host || !user || !pass) {
    console.warn("[Email Service] SMTP credentials not fully configured. Trying local postfix fallback.");

    try {
      const fallbackTransporter = createLocalFallbackTransport();
      const info = await fallbackTransporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
        attachments,
      });
      console.log(`[Email Service] Fallback message sent: ${info.messageId}`);
      return true;
    } catch (fallbackError) {
      console.error("[Email Service] Local postfix fallback failed:", fallbackError);
      return false;
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
      attachments,
    });

    console.log(`[Email Service] Message sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[Email Service] Failed to send email via SMTP, trying local postfix fallback:", error);

    try {
      const fallbackTransporter = createLocalFallbackTransport();
      const info = await fallbackTransporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
        attachments,
      });
      console.log(`[Email Service] Fallback message sent: ${info.messageId}`);
      return true;
    } catch (fallbackError) {
      console.error("[Email Service] Local postfix fallback failed:", fallbackError);
      return false;
    }
  }
}
