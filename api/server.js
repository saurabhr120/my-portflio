const http = require("http");

const PORT = Number(process.env.PORT || 3000);
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "contact@saurabhadvani.online";

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100000) {
        reject(new Error("payload_too_large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function buildEmailHtml(fields) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 12px 0;">New Portfolio Inquiry</h2>
      <p style="margin:0 0 8px 0;"><strong>Name:</strong> ${escapeHtml(fields.name)}</p>
      <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(fields.email)}</p>
      <p style="margin:12px 0 6px 0;"><strong>Message</strong></p>
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(fields.message)}</p>
    </div>
  `.trim();
}

async function sendViaResend(fields) {
  const subject = `Portfolio inquiry from ${fields.name}`;
  const body = {
    from: RESEND_FROM_EMAIL,
    to: [CONTACT_TO_EMAIL],
    reply_to: fields.email,
    subject: subject,
    html: buildEmailHtml(fields),
    text: `Name: ${fields.name}\nEmail: ${fields.email}\n\nMessage:\n${fields.message}`
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data && data.message ? data.message : "Failed to send email via Resend.";
    throw new Error(errorMessage);
  }

  return data;
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/healthz" && req.method === "GET") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.url === "/api/contact" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim();
      const message = String(body.message || "").trim();

      if (!name || !email || !message) {
        return sendJson(res, 400, { ok: false, message: "Name, email, and message are required." });
      }
      if (!isEmail(email)) {
        return sendJson(res, 400, { ok: false, message: "Please provide a valid email address." });
      }
      if (message.length > 5000) {
        return sendJson(res, 400, { ok: false, message: "Message is too long." });
      }
      if (!RESEND_API_KEY) {
        return sendJson(res, 500, { ok: false, message: "Server is missing RESEND_API_KEY configuration." });
      }

      await sendViaResend({ name, email, message });
      return sendJson(res, 200, { ok: true, message: "Message sent successfully." });
    } catch (error) {
      const isClientError = error && (error.message === "invalid_json" || error.message === "payload_too_large");
      const status = isClientError ? 400 : 502;
      const message =
        error.message === "invalid_json"
          ? "Invalid request body."
          : error.message === "payload_too_large"
            ? "Payload too large."
            : (error && error.message) || "Unable to send message right now.";
      return sendJson(res, status, { ok: false, message });
    }
  }

  return sendJson(res, 404, { ok: false, message: "Not found." });
});

server.listen(PORT, () => {
  process.stdout.write(`API listening on port ${PORT}\n`);
});
