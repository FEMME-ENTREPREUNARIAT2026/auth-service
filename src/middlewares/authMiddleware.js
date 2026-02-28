const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Format token invalide' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

const verifyPrestataire = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'PRESTATAIRE') {
      return res.status(403).json({ message: 'Accès réservé aux prestataires' });
    }
    next();
  });
};

module.exports = { verifyToken, verifyPrestataire };