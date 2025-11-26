const express = require('express');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { pool } = require('../database');

const router = express.Router();

// Middleware para verificar si el usuario está autenticado
const isAuthenticated = (req, res, next) => {
  if (req.session.userId && !req.session.pendingTwoFA) {
    return next();
  }
  res.redirect('/auth/login');
};

// Middleware para verificar si está en proceso de 2FA
const isPendingTwoFA = (req, res, next) => {
  if (req.session.userId && req.session.pendingTwoFA) {
    return next();
  }
  res.redirect('/auth/login');
};

// Obtener usuario por ID
async function getUserById(userId) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
    return rows[0];
  } finally {
    connection.release();
  }
}

// Obtener usuario por email
async function getUserByEmail(email) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  } finally {
    connection.release();
  }
}

// GET: Página de login
router.get('/login', (req, res) => {
  res.render('login', { message: null });
});

// POST: Procesar login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { message: 'Por favor complete todos los campos' });
  }

  try {
    const user = await getUserByEmail(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.render('login', { message: 'Email o contraseña incorrectos' });
    }

    // Guardar el ID en sesión pero marcarlo como pendiente de 2FA
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.pendingTwoFA = true;

    // Si no tiene 2FA habilitado, ir al dashboard directamente
    if (!user.two_fa_enabled) {
      req.session.pendingTwoFA = false;
      return res.redirect('/auth/dashboard');
    }

    // Si tiene 2FA, redirigir a verificación
    res.redirect('/auth/verify-2fa');
  } catch (error) {
    console.error('Error en login:', error);
    res.render('login', { message: 'Error al procesar el login' });
  }
});

// GET: Página de registro
router.get('/register', (req, res) => {
  res.render('register', { message: null });
});

// POST: Procesar registro
router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.render('register', { message: 'Por favor complete todos los campos' });
  }

  if (password !== confirmPassword) {
    return res.render('register', { message: 'Las contraseñas no coinciden' });
  }

  if (password.length < 6) {
    return res.render('register', { message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const connection = await pool.getConnection();
  try {
    // Verificar si el email ya existe
    const existingUserByEmail = await getUserByEmail(email);
    if (existingUserByEmail) {
      return res.render('register', { message: 'El email ya está registrado' });
    }

    // Verificar si el username ya existe
    const [existingUserByUsername] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (existingUserByUsername.length > 0) {
      return res.render('register', { message: 'El nombre de usuario ya está registrado' });
    }

    // Hashear contraseña
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insertar usuario
    await connection.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.render('register', { message: '✓ Registro exitoso. Por favor inicie sesión.' });
  } catch (error) {
    console.error('Error en registro:', error);
    
    // Manejo específico de errores de BD
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.sqlMessage.includes('username')) {
        return res.render('register', { message: 'El nombre de usuario ya está registrado' });
      }
      if (error.sqlMessage.includes('email')) {
        return res.render('register', { message: 'El email ya está registrado' });
      }
    }
    
    res.render('register', { message: 'Error al registrar el usuario. Intente nuevamente.' });
  } finally {
    connection.release();
  }
});

// GET: Setup 2FA
router.get('/setup-2fa', isAuthenticated, async (req, res) => {
  try {
    const user = await getUserById(req.session.userId);

    if (user.two_fa_enabled) {
      return res.render('dashboard', { 
        username: user.username,
        email: user.email,
        twoFAEnabled: true,
        message: 'Ya tiene 2FA habilitado'
      });
    }

    // Generar secreto
    const secret = speakeasy.generateSecret({
      name: `2FA Auth (${user.username})`,
      issuer: '2FA Auth App',
      length: 32
    });

    // Generar QR
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.render('setup-2fa', {
      secret: secret.base32,
      qrCode: qrCode,
      message: null
    });
  } catch (error) {
    console.error('Error al configurar 2FA:', error);
    const user = await getUserById(req.session.userId);
    res.render('dashboard', { 
      username: user.username,
      email: user.email,
      twoFAEnabled: user.two_fa_enabled,
      message: 'Error al configurar 2FA'
    });
  }
});

// POST: Confirmar setup 2FA
router.post('/confirm-2fa', isAuthenticated, async (req, res) => {
  const { secret, token } = req.body;

  if (!token) {
    const qrCode = await QRCode.toDataURL(`otpauth://totp/2FA%20Auth?secret=${secret}&issuer=2FA%20Auth%20App`);
    return res.render('setup-2fa', {
      secret: secret,
      qrCode: qrCode,
      message: 'Por favor ingrese el código de verificación'
    });
  }

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2
  });

  if (!verified) {
    const qrCode = await QRCode.toDataURL(`otpauth://totp/2FA%20Auth?secret=${secret}&issuer=2FA%20Auth%20App`);
    return res.render('setup-2fa', {
      secret: secret,
      qrCode: qrCode,
      message: 'Código de verificación inválido'
    });
  }

  // Guardar el secreto en la base de datos
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      'UPDATE users SET two_fa_secret = ?, two_fa_enabled = TRUE WHERE id = ?',
      [secret, req.session.userId]
    );

    const user = await getUserById(req.session.userId);
    res.render('dashboard', {
      username: user.username,
      email: user.email,
      twoFAEnabled: true,
      message: '✓ 2FA habilitado correctamente'
    });
  } catch (error) {
    console.error('Error al confirmar 2FA:', error);
    const user = await getUserById(req.session.userId);
    res.render('dashboard', { 
      username: user.username,
      email: user.email,
      twoFAEnabled: user.two_fa_enabled,
      message: 'Error al guardar la configuración de 2FA'
    });
  } finally {
    connection.release();
  }
});

// GET: Verificar 2FA
router.get('/verify-2fa', isPendingTwoFA, (req, res) => {
  res.render('verify-2fa', { message: null });
});

// POST: Verificar token 2FA
router.post('/verify-2fa', isPendingTwoFA, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.render('verify-2fa', { message: 'Por favor ingrese el código' });
  }

  try {
    const user = await getUserById(req.session.userId);

    const verified = speakeasy.totp.verify({
      secret: user.two_fa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.render('verify-2fa', { message: 'Código de verificación inválido' });
    }

    // Marcar 2FA como verificado
    req.session.pendingTwoFA = false;
    res.redirect('/auth/dashboard');
  } catch (error) {
    console.error('Error en verificación de 2FA:', error);
    res.render('verify-2fa', { message: 'Error al verificar el código' });
  }
});

// GET: Dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await getUserById(req.session.userId);
    res.render('dashboard', {
      username: user.username,
      email: user.email,
      twoFAEnabled: user.two_fa_enabled,
      message: null
    });
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.render('dashboard', { 
      username: req.session.username,
      email: null,
      twoFAEnabled: false,
      message: 'Error al cargar el dashboard'
    });
  }
});

// GET: Desabilitar 2FA
router.get('/disable-2fa', isAuthenticated, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      'UPDATE users SET two_fa_secret = NULL, two_fa_enabled = FALSE WHERE id = ?',
      [req.session.userId]
    );

    const user = await getUserById(req.session.userId);
    res.render('dashboard', {
      username: user.username,
      email: user.email,
      twoFAEnabled: false,
      message: '✓ 2FA ha sido deshabilitado'
    });
  } catch (error) {
    console.error('Error al deshabilitar 2FA:', error);
    res.render('dashboard', { 
      username: req.session.username,
      email: null,
      twoFAEnabled: false,
      message: 'Error al deshabilitar 2FA'
    });
  } finally {
    connection.release();
  }
});

// GET: Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error al cerrar sesión');
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;
