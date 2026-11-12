const { expressjwt } = require('express-jwt');
const { User } = require('../models/sql');
const { secret, issuer, audience } = require('../config/jwt');
const createError = require('http-errors');

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
      // el mensaje lo traduce el manejador central de errores
      return next(createError(401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

const authenticate = [verifyToken, loadUser]

module.exports = {authenticate}