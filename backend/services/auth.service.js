const { User } = require('../models/sql');
const { verifyPassword } = require('../utils/password');
const jwt = require('jsonwebtoken');
const { secret, expiresIn, issuer, audience } = require('../config/jwt');

function signToken(user) {
  const jwtOptions = {
    expiresIn,
    issuer,
    audience,
    algorithm: 'HS256'
  };
  return jwt.sign({ sub: String(user.id) }, secret, jwtOptions);
}

async function authenticateCredentials(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    const error = new Error('credentialsRequired');
    error.status = 400;
    throw error;
  }

  const user = await User.findOne({ where: { email: email.trim() } });
  if (!user || !user.active) {
    const error = new Error('invalidCredentials');
    error.status = 401;
    throw error;
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    const error = new Error('invalidCredentials');
    error.status = 401;
    throw error;
  }

  const token = signToken(user);
  return { user, token };
}

module.exports = {
  authenticateCredentials,
  signToken
};