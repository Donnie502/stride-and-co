const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

describe('Permissions API E2E (/api/permissions)', () => {
  const suffix = Date.now();
  const tokens = {};
  const createdIds = new Set();

  let createdPermission = null;
  const permissionKey = `e2e:test:${suffix}`;

  beforeAll(async () => {
    tokens.admin = await login('admin');
    tokens.seller = await login('seller');
    tokens.user = await login('user');
  });

  afterAll(async () => {
    const adminToken = await login('admin');
    for (const id of createdIds) {
      await api.delete(`/api/permissions/${id}`).set(auth(adminToken));
    }
  });

  describe('Ciclo completo con admin', () => {
    test('POST /api/permissions crea un permiso (201)', async () => {
      const res = await api
        .post('/api/permissions')
        .set(auth(tokens.admin))
        .send({
          key: permissionKey,
          description: `Permiso E2E ${suffix}`
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe(en.permissions.created);
      expect(res.body.data).toMatchObject({
        key: permissionKey,
        description: `Permiso E2E ${suffix}`
      });
      expect(res.body.data).toHaveProperty('id');

      createdPermission = res.body.data;
      createdIds.add(createdPermission.id);
    });

    test('GET /api/permissions/:id consulta el permiso creado (200)', async () => {
      const res = await api
        .get(`/api/permissions/${createdPermission.id}`)
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.permissions.found);
      expect(res.body.data).toMatchObject({
        id: createdPermission.id,
        key: permissionKey,
        description: `Permiso E2E ${suffix}`
      });
    });

    test('GET /api/permissions lista permisos (200) e incluye el creado', async () => {
      const res = await api
        .get('/api/permissions')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.permissions.list);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((p) => p.id === createdPermission.id);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        id: createdPermission.id,
        key: permissionKey,
        description: `Permiso E2E ${suffix}`
      });
    });

    test('PUT /api/permissions/:id actualiza el permiso (200) y se confirma con GET', async () => {
      const updatedKey = `e2e:updated:${suffix}`;
      const updatedDescription = `Permiso actualizado ${suffix}`;

      const putRes = await api
        .put(`/api/permissions/${createdPermission.id}`)
        .set(auth(tokens.admin))
        .send({
          key: updatedKey,
          description: updatedDescription
        });

      expect(putRes.statusCode).toBe(200);
      expect(putRes.body.message).toBe(en.permissions.updated);
      expect(putRes.body.data).toMatchObject({
        id: createdPermission.id,
        key: updatedKey,
        description: updatedDescription
      });

      const getRes = await api
        .get(`/api/permissions/${createdPermission.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject({
        id: createdPermission.id,
        key: updatedKey,
        description: updatedDescription
      });
    });

    test('DELETE /api/permissions/:id elimina el permiso (200) y un GET posterior responde 404', async () => {
      const delRes = await api
        .delete(`/api/permissions/${createdPermission.id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.message).toBe(en.permissions.deleted);
      createdIds.delete(createdPermission.id);

      const getRes = await api
        .get(`/api/permissions/${createdPermission.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.permissions.notFound });
    });
  });

  describe('Validaciones y casos de error (400 / 404)', () => {
    test('POST /api/permissions con datos inválidos (sin key o key vacío) responde 400', async () => {
      const missingKeyRes = await api
        .post('/api/permissions')
        .set(auth(tokens.admin))
        .send({ description: 'Sin key' });

      expect(missingKeyRes.statusCode).toBe(400);
      expect(missingKeyRes.body).toEqual({ message: en.permissions.keyRequired });

      const emptyKeyRes = await api
        .post('/api/permissions')
        .set(auth(tokens.admin))
        .send({ key: '   ', description: 'Key vacío' });

      expect(emptyKeyRes.statusCode).toBe(400);
      expect(emptyKeyRes.body).toEqual({ message: en.permissions.keyRequired });
    });

    test('GET /api/permissions/:id con id mal formado responde 400', async () => {
      const res = await api
        .get('/api/permissions/id-invalido')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(400);
    });

    test('GET, PUT y DELETE /api/permissions/:id con id inexistente responden 404', async () => {
      const nonExistentId = 999999;

      const getRes = await api
        .get(`/api/permissions/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.permissions.notFound });

      const putRes = await api
        .put(`/api/permissions/${nonExistentId}`)
        .set(auth(tokens.admin))
        .send({ key: `e2e:none:${suffix}`, description: 'Inexistente' });
      expect(putRes.statusCode).toBe(404);
      expect(putRes.body).toEqual({ message: en.permissions.notFound });

      const delRes = await api
        .delete(`/api/permissions/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(404);
      expect(delRes.body).toEqual({ message: en.permissions.notFound });
    });
  });

  describe('Control de acceso: seller y user reciben 403', () => {
    test.each(['seller', 'user'])(
      '%s recibe 403 en GET, POST, PUT y DELETE /api/permissions',
      async (role) => {
        const token = tokens[role];

        const listRes = await api.get('/api/permissions').set(auth(token));
        expect(listRes.statusCode).toBe(403);
        expect(listRes.body).toEqual({ message: en.auth.forbidden });

        const findRes = await api.get('/api/permissions/1').set(auth(token));
        expect(findRes.statusCode).toBe(403);
        expect(findRes.body).toEqual({ message: en.auth.forbidden });

        const createRes = await api
          .post('/api/permissions')
          .set(auth(token))
          .send({
            key: `denied:${role}:${Date.now()}`,
            description: 'Denegado'
          });
        expect(createRes.statusCode).toBe(403);
        expect(createRes.body).toEqual({ message: en.auth.forbidden });

        const updateRes = await api
          .put('/api/permissions/1')
          .set(auth(token))
          .send({ description: 'Denegado' });
        expect(updateRes.statusCode).toBe(403);
        expect(updateRes.body).toEqual({ message: en.auth.forbidden });

        const deleteRes = await api.delete('/api/permissions/1').set(auth(token));
        expect(deleteRes.statusCode).toBe(403);
        expect(deleteRes.body).toEqual({ message: en.auth.forbidden });
      }
    );
  });
});
