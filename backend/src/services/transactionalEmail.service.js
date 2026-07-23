import { env } from "../config/env.js";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";
const EMAIL_TIMEOUT_MS = 12_000;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function passwordResetMessage({ firstName, resetUrl, expiresInMinutes }) {
  const recipientName = firstName || "pessoa sambista";
  const safeName = escapeHtml(recipientName);
  const safeUrl = escapeHtml(resetUrl);
  const subject = "Redefina sua senha do 77Gira";
  const textContent = [
    `Olá, ${recipientName}.`,
    "",
    "Recebemos uma solicitação para redefinir a senha da sua conta 77Gira.",
    `Use este link em até ${expiresInMinutes} minutos: ${resetUrl}`,
    "",
    "Se você não fez esta solicitação, ignore esta mensagem. Sua senha continuará a mesma.",
    "",
    "Equipe 77Gira"
  ].join("\n");
  const htmlContent = `
    <!doctype html>
    <html lang="pt-BR">
      <body style="margin:0;background:#f5f6f8;color:#172033;font-family:Arial,sans-serif">
        <div style="max-width:560px;margin:0 auto;padding:32px 18px">
          <div style="background:#fff;border:1px solid #dfe3ea;border-radius:12px;padding:30px">
            <div style="font-size:22px;font-weight:700;color:#ff7a00;margin-bottom:26px">77Gira</div>
            <h1 style="font-size:24px;line-height:1.2;margin:0 0 14px">Redefina sua senha</h1>
            <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Olá, ${safeName}.</p>
            <p style="font-size:15px;line-height:1.6;margin:0 0 22px">Recebemos uma solicitação para redefinir a senha da sua conta. O link é individual e expira em ${expiresInMinutes} minutos.</p>
            <a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;padding:13px 20px;font-weight:700">Criar nova senha</a>
            <p style="font-size:13px;line-height:1.55;color:#667085;margin:24px 0 0">Se você não fez esta solicitação, ignore esta mensagem. Sua senha continuará a mesma.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, textContent, htmlContent };
}

export async function sendPasswordResetEmail({ email, firstName, resetUrl, expiresInMinutes }) {
  if (!env.brevoApiKey || !env.emailFromAddress) {
    throw new Error("transactional_email_not_configured");
  }

  const message = passwordResetMessage({ firstName, resetUrl, expiresInMinutes });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch(BREVO_SEND_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "api-key": env.brevoApiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: env.emailFromName, email: env.emailFromAddress },
        to: [{ email, name: firstName || undefined }],
        replyTo: env.emailReplyTo ? { email: env.emailReplyTo } : undefined,
        subject: message.subject,
        textContent: message.textContent,
        htmlContent: message.htmlContent,
        tags: ["password-reset"]
      })
    });

    if (!response.ok) {
      throw new Error(`transactional_email_provider_${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
