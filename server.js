const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/auth.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'auth-service fonctionne !' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`auth-service actif sur le port ${PORT}`);
});
