const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
const { sendEmail, verificationTemplate, resetPasswordTemplate } = require('../services/emailService');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ─── Génère un code numérique à 6 chiffres ────────────────────
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── POST /auth/send-verification ────────────────────────────
// Envoie (ou renvoi) un code de vérification à l'email donné
const sendVerification = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requis' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Compte introuvable' });
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email déjà vérifié' });
    }

    const code = generateCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { email },
      data: { verificationCode: code, verificationExpiry: expiry },
    });

    const template = verificationTemplate(code);
    await sendEmail({ to: email, ...template });

    // En mode dev, on retourne aussi le code dans la réponse
    const isDev = !process.env.SMTP_HOST;
    res.json({
      message: 'Code envoyé',
      ...(isDev && { devCode: code, devNote: 'Code visible en mode développement uniquement' }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── POST /auth/verify-email ──────────────────────────────────
// Vérifie le code saisi par l'utilisateur
const verifyEmail = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: 'Email et code requis' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Compte introuvable' });
    if (user.emailVerified) return res.json({ message: 'Email déjà vérifié' });

    if (
      user.verificationCode !== String(code) ||
      !user.verificationExpiry ||
      new Date() > new Date(user.verificationExpiry)
    ) {
      return res.status(400).json({ message: 'Code invalide ou expiré' });
    }

    await prisma.user.update({
      where: { email },
      data: { emailVerified: true, verificationCode: null, verificationExpiry: null },
    });

    res.json({ message: 'Email vérifié avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── POST /auth/forgot-password ───────────────────────────────
// Envoie un code de réinitialisation
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requis' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Toujours répondre OK pour ne pas révéler si l'email existe
    if (!user) return res.json({ message: 'Si cet email existe, un code vous sera envoyé' });

    const code = generateCode();
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.user.update({
      where: { email },
      data: { resetToken: code, resetExpiry: expiry },
    });

    const template = resetPasswordTemplate(code, FRONTEND_URL);
    await sendEmail({ to: email, ...template });

    const isDev = !process.env.SMTP_HOST;
    res.json({
      message: 'Si cet email existe, un code vous sera envoyé',
      ...(isDev && { devCode: code, devNote: 'Code visible en mode développement uniquement' }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── POST /auth/reset-password ────────────────────────────────
// Réinitialise le mot de passe avec le code reçu
const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code et nouveau mot de passe requis' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit faire au moins 6 caractères' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Compte introuvable' });

    if (
      user.resetToken !== String(code) ||
      !user.resetExpiry ||
      new Date() > new Date(user.resetExpiry)
    ) {
      return res.status(400).json({ message: 'Code invalide ou expiré' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashed, resetToken: null, resetExpiry: null },
    });

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { sendVerification, verifyEmail, forgotPassword, resetPassword };
