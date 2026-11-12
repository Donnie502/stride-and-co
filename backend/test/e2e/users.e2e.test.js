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

  function trackUser(res) {
    if (res.body?.data?.id) {
      createdIds.add(res.body.data.id);
    }
    return res;
  }

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
    test('crear (201), consultar por id (200), listar (200), actualizar (200) y confirmar con GET, eliminar (200) y GET da 404 sin exponer password_hash ni salt_key', async () => {
      const userEmail = `user.e2e.${suffix}@stride.example`;

      // 1. Crear (201)
      const createRes = trackUser(
        await api
          .post('/api/users')
          .set(auth(tokens.admin))
          .send({
            name: 'Usuario',
            lastName: `E2E ${suffix}`,
            email: userEmail,
            roleId: userRoleId,
            password: 'PasswordE2E2026!'
          })
      );

      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.message).toBe(en.users.created);
      expect(createRes.body.data).toMatchObject({
        first_name: 'Usuario',
        last_name: `E2E ${suffix}`,
        email: userEmail,
        role_id: userRoleId,
        active: true
      });
      expect(createRes.body.data).toHaveProperty('id');
      expectNoPasswordFields(createRes.body.data);

      const createdUser = createRes.body.data;

      // 2. Consultar por id (200)
      const findRes = await api
        .get(`/api/users/${createdUser.id}`)
        .set(auth(tokens.admin));

      expect(findRes.statusCode).toBe(200);
      expect(findRes.body.message).toBe(en.users.found);
      expect(findRes.body.data).toMatchObject({
        id: createdUser.id,
        first_name: 'Usuario',
        last_name: `E2E ${suffix}`,
        email: userEmail,
        role_id: userRoleId,
        active: true
      });
      expectNoPasswordFields(findRes.body.data);

      // 3. Listar (200 e incluir el creado)
      const listRes = await api
        .get('/api/users')
        .set(auth(tokens.admin));

      expect(listRes.statusCode).toBe(200);
      expect(listRes.body.message).toBe(en.users.list);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      const found = listRes.body.data.find((u) => u.email === userEmail);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        first_name: 'Usuario',
        last_name: `E2E ${suffix}`,
        email: userEmail,
        role_id: userRoleId
      });

      for (const user of listRes.body.data) {
        expectNoPasswordFields(user);
      }

      // 4. Actualizar (200) y confirmar con GET
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

      const confirmGetRes = await api
        .get(`/api/users/${createdUser.id}`)
        .set(auth(tokens.admin));

      expect(confirmGetRes.statusCode).toBe(200);
      expect(confirmGetRes.body.data).toMatchObject({
        id: createdUser.id,
        first_name: updatedName,
        last_name: updatedLastName,
        email: userEmail,
        role_id: userRoleId
      });
      expectNoPasswordFields(confirmGetRes.body.data);

      // 5. Eliminar (200) y GET da 404
      const delRes = await api
        .delete(`/api/users/${createdUser.id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.message).toBe(en.users.deleted);
      expectNoPasswordFields(delRes.body.data);
      createdIds.delete(createdUser.id);

      const afterDelRes = await api
        .get(`/api/users/${createdUser.id}`)
        .set(auth(tokens.admin));

      expect(afterDelRes.statusCode).toBe(404);
      expect(afterDelRes.body).toEqual({ message: en.users.notFound });
    });
  });

  describe('Validaciones y casos de error (400 / 404)', () => {
    test('POST /api/users con email repetido responde 400', async () => {
      const dupEmail = `dup.user.${Date.now()}@stride.example`;

      const firstRes = trackUser(
        await api
          .post('/api/users')
          .set(auth(tokens.admin))
          .send({
            name: 'Primero',
            lastName: 'E2E',
            email: dupEmail,
            roleId: userRoleId,
            password: 'PasswordE2E2026!'
          })
      );

      expect(firstRes.statusCode).toBe(201);

      const secondRes = trackUser(
        await api
          .post('/api/users')
          .set(auth(tokens.admin))
          .send({
            name: 'Segundo',
            lastName: 'E2E',
            email: dupEmail,
            roleId: userRoleId,
            password: 'PasswordE2E2026!'
          })
      );

      expect(secondRes.statusCode).toBe(400);
      expect(secondRes.body).toEqual({ message: en.common.duplicate });
    });

    test('POST /api/users con body inválido (faltan campos obligatorios) responde 400', async () => {
      const res = trackUser(
        await api
          .post('/api/users')
          .set(auth(tokens.admin))
          .send({ name: 'Incompleto' })
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.users.requiredFields });
    });

    test('GET, PUT y DELETE /api/users/:id con id mal formado responden 400', async () => {
      const getRes = await api
        .get('/api/users/id-invalido')
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(400);
      expect(getRes.body).toEqual({ message: en.common.invalidId });

      const putRes = await api
        .put('/api/users/id-invalido')
        .set(auth(tokens.admin))
        .send({ name: 'Invalido' });
      expect(putRes.statusCode).toBe(400);
      expect(putRes.body).toEqual({ message: en.common.invalidId });

      const delRes = await api
        .delete('/api/users/id-invalido')
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(400);
      expect(delRes.body).toEqual({ message: en.common.invalidId });
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

        const createRes = trackUser(
          await api
            .post('/api/users')
            .set(auth(token))
            .send({
              name: 'Denegado',
              lastName: 'E2E',
              email: `denied.${role}.${Date.now()}@stride.example`,
              roleId: userRoleId,
              password: 'PasswordE2E2026!'
            })
        );
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
