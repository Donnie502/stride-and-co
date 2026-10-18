const { expressjwt } = require('express-jwt');
const { User } = require('../models/relationals');
const { secret, issuer, audience } = require('../config/jwt');

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
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

const authenticate = [verifyToken, loadUser]

module.exports = {authenticate}