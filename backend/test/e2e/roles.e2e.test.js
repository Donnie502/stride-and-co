const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

describe('Roles API E2E (/api/roles)', () => {
  const suffix = Date.now();
  const tokens = {};
  const createdRoleIds = new Set();

  let testPermission = null;
  let createdRole = null;
  const roleName = `role-e2e-${suffix}`;

  beforeAll(async () => {
    tokens.admin = await login('admin');
    tokens.seller = await login('seller');
    tokens.user = await login('user');

    const permRes = await api
      .post('/api/permissions')
      .set(auth(tokens.admin))
      .send({
        key: `roles:e2e:${suffix}`,
        description: `Permiso temporal para prueba de roles ${suffix}`
      });

    expect(permRes.statusCode).toBe(201);
    testPermission = permRes.body.data;
  });

  afterAll(async () => {
    const adminToken = await login('admin');

    for (const id of createdRoleIds) {
      await api.delete(`/api/roles/${id}`).set(auth(adminToken));
    }

    if (testPermission && testPermission.id) {
      await api.delete(`/api/permissions/${testPermission.id}`).set(auth(adminToken));
    }
  });

  describe('Ciclo completo con admin', () => {
    test('POST /api/roles crea un rol con permissionIds (201)', async () => {
      const res = await api
        .post('/api/roles')
        .set(auth(tokens.admin))
        .send({
          name: roleName,
          description: `Rol E2E ${suffix}`,
          permissionIds: [testPermission.id]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe(en.roles.created);
      expect(res.body.data).toMatchObject({
        name: roleName,
        description: `Rol E2E ${suffix}`
      });
      expect(res.body.data).toHaveProperty('id');

      createdRole = res.body.data;
      createdRoleIds.add(createdRole.id);
    });

    test('GET /api/roles/:id consulta el rol creado (200) con sus permisos', async () => {
      const res = await api
        .get(`/api/roles/${createdRole.id}`)
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.roles.found);
      expect(res.body.data).toMatchObject({
        id: createdRole.id,
        name: roleName,
        description: `Rol E2E ${suffix}`
      });
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.some((p) => p.id === testPermission.id)).toBe(true);
    });

    test('GET /api/roles lista roles (200) e incluye el creado', async () => {
      const res = await api
        .get('/api/roles')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.roles.list);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((r) => r.id === createdRole.id);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        id: createdRole.id,
        name: roleName,
        description: `Rol E2E ${suffix}`
      });
    });

    test('PUT /api/roles/:id actualiza el rol (200) y se confirma con GET', async () => {
      const updatedName = `role-updated-${suffix}`;
      const updatedDescription = `Rol actualizado ${suffix}`;

      const putRes = await api
        .put(`/api/roles/${createdRole.id}`)
        .set(auth(tokens.admin))
        .send({
          name: updatedName,
          description: updatedDescription,
          permissionIds: [testPermission.id]
        });

      expect(putRes.statusCode).toBe(200);
      expect(putRes.body.message).toBe(en.roles.updated);
      expect(putRes.body.data).toMatchObject({
        id: createdRole.id,
        name: updatedName,
        description: updatedDescription
      });

      const getRes = await api
        .get(`/api/roles/${createdRole.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject({
        id: createdRole.id,
        name: updatedName,
        description: updatedDescription
      });
    });

    test('DELETE /api/roles/:id elimina el rol (200) y un GET posterior responde 404', async () => {
      const delRes = await api
        .delete(`/api/roles/${createdRole.id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.message).toBe(en.roles.deleted);
      createdRoleIds.delete(createdRole.id);

      const getRes = await api
        .get(`/api/roles/${createdRole.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.roles.notFound });
    });
  });

  describe('Validaciones y casos de error (400 / 404)', () => {
    test('POST /api/roles con datos inválidos responde 400', async () => {
      const missingFieldsRes = await api
        .post('/api/roles')
        .set(auth(tokens.admin))
        .send({ name: `incompleto-${suffix}` });

      expect(missingFieldsRes.statusCode).toBe(400);
      expect(missingFieldsRes.body).toEqual({ message: en.roles.requiredFields });

      const nonStringNameRes = await api
        .post('/api/roles')
        .set(auth(tokens.admin))
        .send({ name: 12345, description: 'Nombre numérico' });

      expect(nonStringNameRes.statusCode).toBe(400);
      expect(nonStringNameRes.body).toEqual({ message: en.roles.nameNotString });
    });

    test('GET /api/roles/:id con id mal formado responde 400', async () => {
      const res = await api
        .get('/api/roles/id-invalido')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.common.invalidId });
    });

    test('GET, PUT y DELETE /api/roles/:id con id inexistente responden 404', async () => {
      const nonExistentId = 999999;

      const getRes = await api
        .get(`/api/roles/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.roles.notFound });

      const putRes = await api
        .put(`/api/roles/${nonExistentId}`)
        .set(auth(tokens.admin))
        .send({ name: `none-${suffix}`, description: 'Inexistente' });
      expect(putRes.statusCode).toBe(404);
      expect(putRes.body).toEqual({ message: en.roles.notFound });

      const delRes = await api
        .delete(`/api/roles/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(404);
      expect(delRes.body).toEqual({ message: en.roles.notFound });
    });
  });

  describe('Control de acceso: seller y user reciben 403', () => {
    test.each(['seller', 'user'])(
      '%s recibe 403 en GET, POST, PUT y DELETE /api/roles',
      async (role) => {
        const token = tokens[role];

        const listRes = await api.get('/api/roles').set(auth(token));
        expect(listRes.statusCode).toBe(403);
        expect(listRes.body).toEqual({ message: en.auth.forbidden });

        const findRes = await api.get('/api/roles/1').set(auth(token));
        expect(findRes.statusCode).toBe(403);
        expect(findRes.body).toEqual({ message: en.auth.forbidden });

        const createRes = await api
          .post('/api/roles')
          .set(auth(token))
          .send({
            name: `denied-${role}-${Date.now()}`,
            description: 'Denegado',
            permissionIds: [testPermission.id]
          });
        expect(createRes.statusCode).toBe(403);
        expect(createRes.body).toEqual({ message: en.auth.forbidden });

        const updateRes = await api
          .put('/api/roles/1')
          .set(auth(token))
          .send({ description: 'Denegado' });
        expect(updateRes.statusCode).toBe(403);
        expect(updateRes.body).toEqual({ message: en.auth.forbidden });

        const deleteRes = await api.delete('/api/roles/1').set(auth(token));
        expect(deleteRes.statusCode).toBe(403);
        expect(deleteRes.body).toEqual({ message: en.auth.forbidden });
      }
    );
  });
});
