const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

function expectNoPasswordFields(user) {
  expect(user).toBeDefined();
  expect(user).not.toHaveProperty('password_hash');
  expect(user).not.toHaveProperty('salt_key');
}

describe('Users API E2E (/api/users)', () => {
  const suffix = Date.now();
  const tokens = {};
  const createdIds = new Set();

  let userRoleId = null;
  let createdUser = null;
  const userEmail = `user.e2e.${suffix}@stride.example`;

  beforeAll(async () => {
    tokens.admin = await login('admin');
    tokens.seller = await login('seller');
    tokens.user = await login('user');

    const rolesRes = await api
      .get('/api/roles')
      .set(auth(tokens.admin));

    expect(rolesRes.statusCode).toBe(200);
    expect(Array.isArray(rolesRes.body.data)).toBe(true);

    const userRole = rolesRes.body.data.find((role) => role.name === 'user');
    expect(userRole).toBeDefined();
    userRoleId = userRole.id;
  });

  afterAll(async () => {
    const adminToken = await login('admin');
    for (const id of createdIds) {
      await api.delete(`/api/users/${id}`).set(auth(adminToken));
    }
  });

  describe('Ciclo completo con admin', () => {
    test('POST /api/users crea un usuario (201) sin exponer password_hash ni salt_key', async () => {
      const res = await api
        .post('/api/users')
        .set(auth(tokens.admin))
        .send({
          name: 'Usuario',
          lastName: `E2E ${suffix}`,
          email: userEmail,
          roleId: userRoleId,
          password: 'PasswordE2E2026!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe(en.users.created);
      expect(res.body.data).toMatchObject({
        first_name: 'Usuario',
        last_name: `E2E ${suffix}`,
        email: userEmail,
        role_id: userRoleId,
        active: true
      });
      expect(res.body.data).toHaveProperty('id');
      expectNoPasswordFields(res.body.data);

      createdUser = res.body.data;
      createdIds.add(createdUser.id);
    });

    test('GET /api/users/:id consulta el usuario creado (200) sin password_hash ni salt_key', async () => {
      const res = await api
        .get(`/api/users/${createdUser.id}`)
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.users.found);
      expect(res.body.data).toMatchObject({
        id: createdUser.id,
        first_name: 'Usuario',
        last_name: `E2E ${suffix}`,
        email: userEmail,
        role_id: userRoleId,
        active: true
      });
      expectNoPasswordFields(res.body.data);
    });

    test('GET /api/users lista usuarios (200), incluye el creado y no expone password_hash ni salt_key', async () => {
      const res = await api
        .get('/api/users')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.users.list);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((u) => u.email === userEmail);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        first_name: 'Usuario',
        last_name: `E2E ${suffix}`,
        email: userEmail,
        role_id: userRoleId
      });

      for (const user of res.body.data) {
        expectNoPasswordFields(user);
      }
    });

    test('PUT /api/users/:id actualiza el usuario (200) y se confirma con GET', async () => {
      const updatedName = 'UsuarioActualizado';
      const updatedLastName = `Apellido ${suffix}`;

      const putRes = await api
        .put(`/api/users/${createdUser.id}`)
        .set(auth(tokens.admin))
        .send({
          name: updatedName,
          lastName: updatedLastName
        });

      expect(putRes.statusCode).toBe(200);
      expect(putRes.body.message).toBe(en.users.updated);
      expect(putRes.body.data).toMatchObject({
        id: createdUser.id,
        first_name: updatedName,
        last_name: updatedLastName,
        email: userEmail,
        role_id: userRoleId
      });
      expectNoPasswordFields(putRes.body.data);

      const getRes = await api
        .get(`/api/users/${createdUser.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject({
        id: createdUser.id,
        first_name: updatedName,
        last_name: updatedLastName,
        email: userEmail,
        role_id: userRoleId
      });
      expectNoPasswordFields(getRes.body.data);
    });

    test('DELETE /api/users/:id elimina el usuario (200) y un GET posterior responde 404', async () => {
      const delRes = await api
        .delete(`/api/users/${createdUser.id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.message).toBe(en.users.deleted);
      expectNoPasswordFields(delRes.body.data);
      createdIds.delete(createdUser.id);

      const getRes = await api
        .get(`/api/users/${createdUser.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.users.notFound });
    });
  });

  describe('Validaciones y casos de error (400 / 404)', () => {
    test('POST /api/users con email repetido responde 400', async () => {
      const dupEmail = `dup.user.${Date.now()}@stride.example`;

      const firstRes = await api
        .post('/api/users')
        .set(auth(tokens.admin))
        .send({
          name: 'Primero',
          lastName: 'E2E',
          email: dupEmail,
          roleId: userRoleId,
          password: 'PasswordE2E2026!'
        });

      expect(firstRes.statusCode).toBe(201);
      if (firstRes.body?.data?.id) {
        createdIds.add(firstRes.body.data.id);
      }

      const secondRes = await api
        .post('/api/users')
        .set(auth(tokens.admin))
        .send({
          name: 'Segundo',
          lastName: 'E2E',
          email: dupEmail,
          roleId: userRoleId,
          password: 'PasswordE2E2026!'
        });

      if (secondRes.body?.data?.id) {
        createdIds.add(secondRes.body.data.id);
      }

      expect(secondRes.statusCode).toBe(400);
    });

    test('POST /api/users con body inválido (faltan campos obligatorios) responde 400', async () => {
      const res = await api
        .post('/api/users')
        .set(auth(tokens.admin))
        .send({ name: 'Incompleto' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.users.requiredFields });
    });

    test('GET /api/users/:id con id mal formado responde 400', async () => {
      const res = await api
        .get('/api/users/id-invalido')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(400);
    });

    test('GET, PUT y DELETE /api/users/:id con id inexistente responden 404', async () => {
      const nonExistentId = 999999;

      const getRes = await api
        .get(`/api/users/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.users.notFound });

      const putRes = await api
        .put(`/api/users/${nonExistentId}`)
        .set(auth(tokens.admin))
        .send({ name: 'Nadie' });
      expect(putRes.statusCode).toBe(404);
      expect(putRes.body).toEqual({ message: en.users.notFound });

      const delRes = await api
        .delete(`/api/users/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(404);
      expect(delRes.body).toEqual({ message: en.users.notFound });
    });
  });

  describe('Control de acceso: user y seller reciben 403', () => {
    test.each(['user', 'seller'])(
      '%s recibe 403 en GET, POST, PUT y DELETE /api/users',
      async (role) => {
        const token = tokens[role];

        const listRes = await api.get('/api/users').set(auth(token));
        expect(listRes.statusCode).toBe(403);
        expect(listRes.body).toEqual({ message: en.auth.forbidden });

        const findRes = await api.get('/api/users/1').set(auth(token));
        expect(findRes.statusCode).toBe(403);
        expect(findRes.body).toEqual({ message: en.auth.forbidden });

        const createRes = await api
          .post('/api/users')
          .set(auth(token))
          .send({
            name: 'Denegado',
            lastName: 'E2E',
            email: `denied.${role}.${Date.now()}@stride.example`,
            roleId: userRoleId,
            password: 'PasswordE2E2026!'
          });
        expect(createRes.statusCode).toBe(403);
        expect(createRes.body).toEqual({ message: en.auth.forbidden });

        const updateRes = await api
          .put('/api/users/1')
          .set(auth(token))
          .send({ name: 'Denegado' });
        expect(updateRes.statusCode).toBe(403);
        expect(updateRes.body).toEqual({ message: en.auth.forbidden });

        const deleteRes = await api.delete('/api/users/1').set(auth(token));
        expect(deleteRes.statusCode).toBe(403);
        expect(deleteRes.body).toEqual({ message: en.auth.forbidden });
      }
    );
  });
});
