const { expressjwt } = require('express-jwt');
const { User } = require('../models/sql');
const { secret, issuer, audience } = require('../config/jwt');
const { t } = require('../utils/translate');

const verifyToken = expressjwt({
  secret,
  algorithms: ['HS256'],
  issuer,
  audience
});


async function loadUser(req, res, next) {
  try {
    const user = await User.findByPk(req.auth.sub);

    if (!user || !user.active) {
      return res.status(401).json({ message: t(req, 'auth.unauthorized') });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

const authenticate = [verifyToken, loadUser]

module.exports = {authenticate}