const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const register = async (req, res) => {
  const { email, password, nom, role, telephone, categorieSlug } = req.body;

  if (!email || !password || !nom) {
    return res.status(400).json({ message: 'Email, mot de passe et nom sont obligatoires' });
  }

  try {
    const userExistant = await prisma.user.findUnique({ where: { email } });
    if (userExistant) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    if (role === 'PRESTATAIRE' && !categorieSlug) {
    return res.status(400).json({ message: 'Une prestataire doit choisir sa catégorie de service' });
    }

    const passwordHashe = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHashe,
        nom,
        role: role || 'CLIENT',
        telephone: telephone || null,
        categorieSlug: role === 'PRESTATAIRE' ? categorieSlug : null,
      }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Compte créé avec succès',
      token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        role: user.role,
        categorieSlug: user.categorieSlug,
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe obligatoires' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const passwordValide = await bcrypt.compare(password, user.password);
    if (!passwordValide) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        role: user.role,
        categorieSlug: user.categorieSlug,
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        nom: true,
        role: true,
        telephone: true,
        avatar: true,
        categorieSlug: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    res.json(user);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { register, login, getMe };