const authService = require('../../services/auth.service');

function getSafeRedirectUrl(url) {
  if (typeof url !== 'string' || !url) return '/';
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  return '/';
}

function showLoginForm(req, res) {
  if (res.locals.currentUser) {
    return res.redirect('/');
  }

  if (req.cookies && req.cookies.access_token) {
    res.clearCookie('access_token');
  }

  const redirectTo = getSafeRedirectUrl(req.query.redirectTo || req.body?.redirectTo);

  res.render('auth/login', {
    title: req.__('auth.loginTitle'),
    email: 'admin@demo.stride.example',
    redirectTo,
    error: null
  });
}

async function login(req, res, next) {
  const { email, password, redirectTo: bodyRedirect } = req.body;
  const redirectTo = getSafeRedirectUrl(bodyRedirect || req.query.redirectTo);

  try {
    const { token } = await authService.authenticateCredentials(email, password);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.redirect(redirectTo);
  } catch (err) {
    if (err.status === 400 || err.status === 401) {
      const errorMsg = err.message === 'credentialsRequired'
        ? req.__('auth.credentialsRequired')
        : req.__('auth.invalidCredentials');

      return res.status(400).render('auth/login', {
        title: req.__('auth.loginTitle'),
        email: email || '',
        redirectTo,
        error: errorMsg
      });
    }
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie('access_token');
  res.redirect('/');
}

module.exports = {
  showLoginForm,
  login,
  logout
};