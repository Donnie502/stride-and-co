const config = require('config');

if (!config.has('jwt.secret') || !String(config.get('jwt.secret')).trim()) {
  throw new Error(
    `Falta jwt.secret. Crea config/local-${config.util.getEnv('NODE_ENV')}.json ` +
    'a partir de config/local-development.example.json (ese archivo no se sube a git).'
  );
}

module.exports = {
  secret: config.get('jwt.secret'),
  expiresIn: config.get('jwt.expiresIn'),
  issuer: config.get('jwt.issuer'),
  audience: config.get('jwt.audience')
};