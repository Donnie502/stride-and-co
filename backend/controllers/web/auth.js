const { User } = require('../../models/sql');
const { verifyPassword } = require('../../utils/password');
const jwt = require('jsonwebtoken');
const { secret, expiresIn, issuer, audience } = require('../../config/jwt');

function signToken(user) {
  const jwtOptions = {
    expiresIn,
    issuer,
    audience,
    algorithm: 'HS256'
  };
  return jwt.sign({ sub: String(user.id) }, secret, jwtOptions);
}

// GET /login - Mostrar formulario de inicio de sesión
function showLoginForm(req, res) {
  // Si ya tiene una cookie de sesión activa, redirigir a la tienda
  if (req.cookies && req.cookies.access_token) {
    return res.redirect('/');
  }

  res.render('auth/login', {
    title: req.__('auth.loginTitle') || 'Iniciar sesión',
    email: 'admin@demo.stride.example',
    error: null
  });
}

// POST /login - Procesar credenciales y guardar JWT en Cookie HTTP-only
async function login(req, res, next) {
  const { email, password } = req.body;

  try {
    // 1. Validación de campos requeridos (HTTP 400)
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).render('auth/login', {
        title: req.__('auth.loginTitle') || 'Iniciar sesión',
        email: email || '',
        error: req.__('auth.credentialsRequired') || 'El correo y la contraseña son requeridos.'
      });
    }

    // 2. Buscar usuario en base de datos
    const user = await User.findOne({ where: { email: email.trim() } });
    if (!user || !user.active) {
      return res.status(400).render('auth/login', {
        title: req.__('auth.loginTitle') || 'Iniciar sesión',
        email,
        error: req.__('auth.invalidCredentials') || 'Credenciales incorrectas o usuario inactivo.'
      });
    }

    // 3. Verificar contraseña con bcrypt
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(400).render('auth/login', {
        title: req.__('auth.loginTitle') || 'Iniciar sesión',
        email,
        error: req.__('auth.invalidCredentials') || 'Credenciales incorrectas o usuario inactivo.'
      });
    }

    // 4. Generar token y guardar en cookie HTTP-only
    const token = signToken(user);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });

    // Redirigir según el flujo de autenticación (por ejemplo, a la página de inicio o a la página solicitada antes del login)
    const redirectTo = req.query.redirectTo || '/';
    return res.redirect(redirectTo);

  } catch (err) {
    next(err);
  }
}

// POST /logout - Eliminar cookie y redirigir
function logout(req, res) {
  res.clearCookie('access_token');
  res.redirect('/');
}

module.exports = {
  showLoginForm,
  login,
  logout
};