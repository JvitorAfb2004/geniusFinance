const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "Genius Finance <onboarding@geniusfinance.app>";

export async function sendWelcomeEmail(email: string, displayName: string) {
  if (!RESEND_API_KEY) {
    console.log("[welcome] RESEND_API_KEY not set");
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [email],
      subject: "Bem-vindo ao Genius Finance!",
      html: `<p>Olá ${displayName || "!"}</p><p>Seu trial de 7 dias começou.</p>`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[welcome] erro:", res.status, err.slice(0, 300));
    throw new Error("falha ao enviar email");
  }
  return { ok: true };
}

export function escapeHtml(str: string) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c
  );
}

export async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY nao configurada");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[email] erro:", res.status, err.slice(0, 300));
    throw new Error("falha ao enviar email");
  }
  return { ok: true };
}
