/**
 * MODULE: Email sending (Nodemailer)
 * ---------------------------------------------------------------
 * Sends emails through any SMTP server configured in .env
 * (Mailtrap for development, Gmail/SendGrid/etc. for production).
 */
const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    // Port 465 uses implicit TLS; other ports (587, 2525) upgrade via STARTTLS.
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends the verification email.
 * @param {string} to        recipient email address
 * @param {string} name      recipient name (for the greeting)
 * @param {string} rawToken  the RAW token to put in the link
 */
async function sendVerificationEmail(to, name, rawToken) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // encodeURIComponent keeps the URL safe even if the token format changes later.
  const link = `${frontendUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const hours = Number(process.env.VERIFICATION_TOKEN_EXPIRES_HOURS) || 24;

  await createTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'EventHorizon <no-reply@eventhorizon.dev>',
    to,
    subject: 'Verify your EventHorizon email',
    text:
      `Hi ${name},\n\nWelcome to EventHorizon! Please verify your email by opening this link:\n\n` +
      `${link}\n\nThis link expires in ${hours} hours. If you didn't sign up, ignore this email.`,
    html:
      `<p>Hi ${escapeHtml(name)},</p>` +
      `<p>Welcome to EventHorizon! Please verify your email address:</p>` +
      `<p><a href="${link}">Verify my email</a></p>` +
      `<p>Or copy this link into your browser:<br>${link}</p>` +
      `<p>This link expires in ${hours} hours. If you didn't sign up, you can ignore this email.</p>`,
  });
}

// Prevents a malicious "name" like <script>... from being injected into the email HTML.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

module.exports = { sendVerificationEmail };
