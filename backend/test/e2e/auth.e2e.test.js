const { api, DEMO_USERS, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

const adminDemo = DEMO_USERS.admin;

describe('Auth API E2E (/api/auth)', () => {
  describe('POST /api/auth/login', () => {
    test('200 con credenciales correctas devuelve el usuario y un token JWT', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: adminDemo.email, password: adminDemo.password });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.auth.loginSuccess);
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.token.length).toBeGreaterThan(0);
      expect(res.body.data.user).toMatchObject({
        email: adminDemo.email,
        active: true
      });
      expect(res.body.data.user).not.toHaveProperty('password_hash');
      expect(res.body.data.user).not.toHaveProperty('salt_key');
    });

    test('401 con contraseña incorrecta', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: adminDemo.email, password: `wrong-${Date.now()}` });

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: en.auth.invalidCredentials });
    });

    test('400 si faltan correo o contraseña', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: adminDemo.email });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.auth.credentialsRequired });
    });
  });

  describe('GET /api/auth/me', () => {
    test('200 con token válido devuelve los datos del usuario autenticado', async () => {
      const token = await login('admin');
      const res = await api
        .get('/api/auth/me')
        .set(auth(token));

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        email: adminDemo.email,
        active: true
      });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('role_id');
    });

    test('401 sin token', async () => {
      const res = await api.get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: en.auth.unauthorized });
    });

    test('401 con token inválido', async () => {
      const res = await api
        .get('/api/auth/me')
        .set(auth('token.invalido.falso'));

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: en.auth.unauthorized });
    });
  });
});
