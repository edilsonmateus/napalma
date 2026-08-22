import { env } from "../config/env.js";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";
const EMAIL_TIMEOUT_MS = 12_000;

function maskEmail(email) {
  const [localPart, domain] = String(email || "").split("@");
  if (!localPart || !domain) return "invalid";
  return `${localPart.slice(0, 1)}***@${domain}`;
}

function emailLog(stage, metadata = {}) {
  console.info("[transactional-email]", stage, metadata);
}

function safeErrorMessage(error) {
  return String(error?.message || "unknown").slice(0, 180);
}

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

function institutionalMessage({ recipientName, subject, contentHtml, contentText, partnerLogos = [] }) {
  const safeName = escapeHtml(recipientName || "");
  const safeSubject = escapeHtml(subject);
  const partnerRail = partnerLogos
    .filter((item) => /^https?:\/\//i.test(String(item?.logoUrl || "")))
    .map((item) => `<img src="${escapeHtml(item.logoUrl)}" alt="${escapeHtml(item.name)}" style="max-height:28px;max-width:92px;object-fit:contain;margin:0 8px 8px 0;vertical-align:middle"/>`)
    .join("");
  const greeting = safeName ? `<p style="font-size:15px;line-height:1.6;margin:0 0 18px">Olá, ${safeName}.</p>` : "";
  const rail = partnerRail ? `<div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:18px"><p style="font-size:11px;color:#667085;margin:0 0 10px">Parceiros que apoiam iniciativas institucionais do 77Gira</p>${partnerRail}</div>` : "";
  return {
    subject,
    textContent: [recipientName ? `Olá, ${recipientName}.` : "", contentText, "", "Equipe 77Gira", "77gira.com.br"].filter(Boolean).join("\n"),
    htmlContent: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f6f8;color:#172033;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:32px 18px"><div style="background:#fff;border:1px solid #dfe3ea;border-radius:12px;padding:30px"><div style="font-size:21px;font-weight:700;color:#ff7a00;margin-bottom:24px">77Gira</div><h1 style="font-size:22px;line-height:1.25;margin:0 0 16px">${safeSubject}</h1>${greeting}<div style="font-size:15px;line-height:1.65">${contentHtml}</div>${rail}<div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:18px;font-size:13px;line-height:1.55;color:#667085">Equipe 77Gira<br/>77gira.com.br</div></div></div></body></html>`
  };
}

async function sendWithBrevo({ email, recipientName, message, tags, replyTo }) {
  const context = {
    recipient: maskEmail(email),
    tags: Array.isArray(tags) ? tags : [],
    subject: String(message?.subject || "").slice(0, 120)
  };
  emailLog("send_requested", context);
  emailLog("configuration_checked", {
    ...context,
    hasApiKey: Boolean(env.brevoApiKey),
    hasSender: Boolean(env.emailFromAddress),
    hasReplyTo: Boolean(replyTo)
  });
  if (!env.brevoApiKey || !env.emailFromAddress) {
    emailLog("configuration_missing", context);
    throw new Error("transactional_email_not_configured");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
  try {
    emailLog("provider_request_started", { ...context, provider: "brevo" });
    const response = await fetch(BREVO_SEND_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { accept: "application/json", "api-key": env.brevoApiKey, "content-type": "application/json" },
      body: JSON.stringify({
        sender: { name: env.emailFromName, email: env.emailFromAddress },
        to: [{ email, name: recipientName || undefined }],
        replyTo: replyTo ? { email: replyTo } : undefined,
        subject: message.subject,
        textContent: message.textContent,
        htmlContent: message.htmlContent,
        tags
      })
    });
    let providerMessageId = null;
    try {
      const payload = await response.clone().json();
      providerMessageId = payload?.messageId || null;
    } catch {
      // The provider response is not required for delivery and may be empty.
    }
    emailLog("provider_response_received", {
      ...context,
      provider: "brevo",
      status: response.status,
      accepted: response.ok,
      providerMessageId
    });
    if (!response.ok) {
      emailLog("provider_rejected_request", { ...context, provider: "brevo", status: response.status });
      throw new Error(`transactional_email_provider_${response.status}`);
    }
    emailLog("provider_accepted_delivery", { ...context, provider: "brevo", providerMessageId });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    emailLog(timedOut ? "provider_timeout" : "provider_request_failed", {
      ...context,
      provider: "brevo",
      reason: safeErrorMessage(error)
    });
    if (timedOut) throw new Error("transactional_email_timeout");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendPasswordResetEmail({ email, firstName, resetUrl, expiresInMinutes }) {
  const message = passwordResetMessage({ firstName, resetUrl, expiresInMinutes });
  return sendWithBrevo({ email, recipientName: firstName, message, tags: ["password-reset"] });
}

export async function sendInstitutionalEmail({ email, recipientName, subject, contentHtml, contentText, partnerLogos }) {
  const message = institutionalMessage({ recipientName, subject, contentHtml, contentText, partnerLogos });
  return sendWithBrevo({
    email,
    recipientName,
    message,
    tags: ["operations-communication", "institutional"],
    replyTo: env.emailReplyTo || "77giramundo@gmail.com"
  });
}

export async function sendLegalSignatureCodeEmail({ email, firstName, code, envelopeTitle, expiresInMinutes }) {
  const safeName = escapeHtml(firstName || "pessoa responsável");
  const safeTitle = escapeHtml(envelopeTitle);
  const message = {
    subject: `Código de confirmação: ${safeTitle}`,
    textContent: `Olá, ${firstName || "pessoa responsável"}.\n\nUse o código ${code} para confirmar a assinatura de “${envelopeTitle}” no 77Gira. Ele expira em ${expiresInMinutes} minutos.\n\nNão compartilhe este código. Se não reconhece esta ação, ignore esta mensagem.\n\nEquipe 77Gira`,
    htmlContent: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f6f8;color:#172033;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px 18px"><div style="background:#fff;border:1px solid #dfe3ea;border-radius:12px;padding:30px"><div style="font-size:22px;font-weight:700;color:#ff7a00;margin-bottom:24px">77Gira</div><h1 style="font-size:22px;line-height:1.25;margin:0 0 16px">Confirme sua assinatura</h1><p style="font-size:15px;line-height:1.6">Olá, ${safeName}.</p><p style="font-size:15px;line-height:1.6">Para confirmar a assinatura de <strong>${safeTitle}</strong>, informe o código abaixo no 77Gira:</p><div style="margin:22px 0;padding:16px;text-align:center;background:#f3f6fb;border-radius:10px;font-size:28px;letter-spacing:7px;font-weight:700">${escapeHtml(code)}</div><p style="font-size:13px;line-height:1.55;color:#667085">O código expira em ${expiresInMinutes} minutos e não deve ser compartilhado. Se você não reconhece esta ação, ignore este e-mail.</p></div></div></body></html>`
  };
  return sendWithBrevo({ email, recipientName: firstName, message, tags: ["legal-signature", "security"] });
}

export async function sendLegalSignatureInvitationEmail({ email, firstName, envelopeTitle, protocol, expiresAt }) {
  const safeName = escapeHtml(firstName || "pessoa respons\u00e1vel");
  const safeTitle = escapeHtml(envelopeTitle);
  const signingUrl = `${env.publicAppUrl.replace(/\/$/, "")}/settings/account`;
  const deadline = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(expiresAt));
  const message = {
    subject: `Assinatura aguardando confirma\u00e7\u00e3o: ${envelopeTitle}`,
    textContent: `Ol\u00e1, ${firstName || "pessoa respons\u00e1vel"}.\n\nO documento \u201c${envelopeTitle}\u201d est\u00e1 aguardando sua assinatura no 77Gira. Protocolo: ${protocol}.\n\nAcesse ${signingUrl} com este mesmo e-mail, abra Configura\u00e7\u00f5es > Documentos e aceites > Assinaturas formais e confirme at\u00e9 ${deadline}.\n\nA assinatura exige sua senha atual e um c\u00f3digo enviado ao seu e-mail.\n\nEquipe 77Gira`,
    htmlContent: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f6f8;color:#172033;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px 18px"><div style="background:#fff;border:1px solid #dfe3ea;border-radius:12px;padding:30px"><div style="font-size:22px;font-weight:700;color:#ff7a00;margin-bottom:24px">77Gira</div><h1 style="font-size:22px;line-height:1.25;margin:0 0 16px">Documento aguardando assinatura</h1><p style="font-size:15px;line-height:1.6">Ol\u00e1, ${safeName}.</p><p style="font-size:15px;line-height:1.6">O documento <strong>${safeTitle}</strong> est\u00e1 aguardando sua assinatura. O protocolo deste convite \u00e9 <strong>${escapeHtml(protocol)}</strong>.</p><p style="font-size:14px;line-height:1.6;color:#475467">Acesse sua conta com este mesmo e-mail at\u00e9 ${escapeHtml(deadline)}. Para concluir, o 77Gira confirmar\u00e1 sua senha atual e um c\u00f3digo enviado ao seu e-mail.</p><a href="${escapeHtml(signingUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;padding:13px 20px;font-weight:700">Abrir documentos e aceites</a></div></div></body></html>`
  };
  return sendWithBrevo({ email, recipientName: firstName, message, tags: ["legal-signature", "invitation"] });
}
