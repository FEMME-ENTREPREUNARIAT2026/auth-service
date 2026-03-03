const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { sendVerification, verifyEmail, forgotPassword, resetPassword } = require('../controllers/verificationController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);

// Vérification email
router.post('/send-verification', sendVerification);
router.post('/verify-email', verifyEmail);

// Réinitialisation mot de passe
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;