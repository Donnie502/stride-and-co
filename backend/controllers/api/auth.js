const authService = require('../../services/auth.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.authenticateCredentials(email, password);

    res.json({
      message: req.__('auth.loginSuccess'),
      data: {
        user,
        token
      }
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ message: req.__('auth.credentialsRequired') });
    }
    if (err.status === 401) {
      return res.status(401).json({ message: req.__('auth.invalidCredentials') });
    }
    next(err);
  }
}

function me(req, res) {
  const { id, first_name, last_name, email, role_id, active } = req.user;
  res.json({ id, first_name, last_name, email, role_id, active });
}

module.exports = { login, me };