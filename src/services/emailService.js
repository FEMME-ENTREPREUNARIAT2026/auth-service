const nodemailer = require('nodemailer');

// ─── Transporter (SMTP ou mode dev) ──────────────────────────
function getTransporter() {
  // Si SMTP configuré dans .env, l'utiliser
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Sinon : mode développement — simule l'envoi (log dans la console)
  return null;
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();

  if (!transporter) {
    // Mode dev : log l'email dans la console
    console.log('\n📧 ── EMAIL (mode développement) ──────────────');
    console.log(`À : ${to}`);
    console.log(`Sujet : ${subject}`);
    console.log(`Contenu : ${text || html}`);
    console.log('─────────────────────────────────────────────\n');
    return { success: true, dev: true };
  }

  // Gmail exige que l'expéditeur corresponde au compte authentifié
  const from = process.env.SMTP_FROM
    || (process.env.SMTP_USER ? `"Fempreneur Hub" <${process.env.SMTP_USER}>` : '"Fempreneur Hub" <noreply@fempreneur.cm>');

  try {
    await transporter.sendMail({ from, to, subject, html, text });
    console.log(`📧 Email envoyé à ${to} : ${subject}`);
    return { success: true };
  } catch (err) {
    console.error('❌ Erreur envoi email :', err.message);
    throw new Error(`Impossible d'envoyer l'email : ${err.message}`);
  }
}

// ─── Templates d'email ────────────────────────────────────────
function verificationTemplate(code) {
  return {
    subject: 'Votre code de vérification — Fempreneur Hub',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f9f9f9; border-radius: 16px;">
        <h2 style="color: #1a3a4a; margin-bottom: 8px;">Vérifiez votre adresse email</h2>
        <p style="color: #555; margin-bottom: 24px;">Voici votre code de vérification pour créer votre compte Fempreneur Hub :</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #E91E63; background: white; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          ${code}
        </div>
        <p style="color: #888; font-size: 13px;">Ce code est valable pendant 10 minutes. Ne partagez pas ce code.</p>
      </div>
    `,
    text: `Votre code de vérification Fempreneur Hub : ${code} (valable 10 minutes)`,
  };
}

function resetPasswordTemplate(code, frontendUrl) {
  return {
    subject: 'Réinitialisation de mot de passe — Fempreneur Hub',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f9f9f9; border-radius: 16px;">
        <h2 style="color: #1a3a4a; margin-bottom: 8px;">Réinitialiser votre mot de passe</h2>
        <p style="color: #555; margin-bottom: 24px;">Voici votre code de réinitialisation :</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #E91E63; background: white; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          ${code}
        </div>
        <p style="color: #555; margin-bottom: 16px;">Ou cliquez sur ce lien :</p>
        <a href="${frontendUrl}/auth/reset-password?token=${code}"
           style="display: inline-block; background: #1a3a4a; color: white; padding: 12px 28px; border-radius: 100px; text-decoration: none; font-weight: bold;">
          Réinitialiser mon mot de passe
        </a>
        <p style="color: #888; font-size: 13px; margin-top: 20px;">Ce code est valable pendant 30 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.</p>
      </div>
    `,
    text: `Votre code de réinitialisation Fempreneur Hub : ${code} (valable 30 minutes)`,
  };
}

module.exports = { sendEmail, verificationTemplate, resetPasswordTemplate };
