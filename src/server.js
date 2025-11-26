const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { pool, initializeDatabase } = require('./database');
const authRoutes = require('./routes/auth');

const app = express();

initializeDatabase().catch(console.error);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'tu_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/auth/dashboard');
  }
  res.redirect('/auth/login');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { message: 'Ocurrió un error en el servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});

module.exports = app;
