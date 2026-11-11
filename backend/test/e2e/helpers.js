const config = require('config');
const request = require('supertest');

const baseUrl = config.get('e2e.baseUrl');
const api = request(baseUrl);

// Cuentas públicas de demostración documentadas en el README
const DEMO_USERS = {
  admin: { email: 'admin@demo.stride.example', password: 'DemoAdmin2026!' },
  seller: { email: 'seller@demo.stride.example', password: 'DemoSeller2026!' },
  user: { email: 'user@demo.stride.example', password: 'DemoUser2026!' }
};

// El token dura 15 minutos; renovamos antes de que expire para corridas largas
const TOKEN_TTL_MS = 10 * 60 * 1000;
const tokenCache = new Map();

async function login(role, force = false) {
  const credentials = DEMO_USERS[role];
  if (!credentials) {
    throw new Error(`Rol demo inválido: "${role}". Usa 'admin', 'seller' o 'user'.`);
  }

  const cached = tokenCache.get(role);
  if (!force && cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const res = await api
    .post('/api/auth/login')
    .send(credentials);

  if (res.statusCode !== 200 || !res.body || !res.body.data || !res.body.data.token) {
    throw new Error(`Falló login E2E para "${role}" (status ${res.statusCode})`);
  }

  const { token } = res.body.data;
  tokenCache.set(role, {
    token,
    expiresAt: Date.now() + TOKEN_TTL_MS
  });

  return token;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  baseUrl,
  api,
  DEMO_USERS,
  login,
  auth
};
