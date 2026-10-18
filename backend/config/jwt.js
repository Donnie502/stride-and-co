const { JWT_SECRET, JWT_EXPIRES_IN, JWT_ISSUER, JWT_AUDIENCE } = process.env;

if (!JWT_SECRET) {
  throw new Error('Falta JWT_SECRET en las variables de entorno');
}

module.exports = {
  secret: JWT_SECRET,
  expiresIn: JWT_EXPIRES_IN || '15m',
  issuer: JWT_ISSUER || 'stride-co',
  audience: JWT_AUDIENCE || 'stride-co-api'
};