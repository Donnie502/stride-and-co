const { expressjwt } = require('express-jwt');
const { User } = require('../models/sql');
const { secret, issuer, audience } = require('../config/jwt');
const createError = require('http-errors');

const verifyToken = expressjwt({
  secret,
  algorithms: ['HS256'],
  issuer,
  audience,
  getToken: (req) => req.cookies?.access_token || req.headers.authorization?.replace(/^Bearer /, '')
});

async function loadUser(req, res, next) {
  try {
    if (req.user && req.user.id === Number(req.auth.sub)) {
      return next();
    }
    
    const user = await User.findByPk(req.auth.sub);

    if (!user || !user.active) {
      return next(createError(401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

const authenticate = [verifyToken, loadUser];

module.exports = { authenticate };