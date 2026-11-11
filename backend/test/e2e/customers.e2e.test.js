const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

const NON_EXISTENT_OBJECT_ID = '0123456789abcdef01234567';

describe('Customers API E2E (/api/customers)', () => {
  const suffix = Date.now();
  const tokens = {};
  const usersMe = {};
  // Guarda { id -> role } para limpiar cada customer con el token de su dueño
  const pendingCleanup = new Map();

  let adminOwnedCustomer = null;

  function trackCustomer(res, role) {
    if (res.body?.data?._id) {
      pendingCleanup.set(res.body.data._id, role);
    }
    return res;
  }

  beforeAll(async () => {
    for (const role of ['admin', 'seller', 'user']) {
      tokens[role] = await login(role);
      const meRes = await api.get('/api/auth/me').set(auth(tokens[role]));
      expect(meRes.statusCode).toBe(200);
      usersMe[role] = meRes.body;
    }

    // Customer de admin para probar restricciones de acceso de otros roles
    const adminCustRes = trackCustomer(
      await api
        .post('/api/customers')
        .set(auth(tokens.admin))
        .send({
          email: `cust.admin.shared.${suffix}@stride.example`,
          phone: '6141000010'
        }),
      'admin'
    );

    expect(adminCustRes.statusCode).toBe(201);
    adminOwnedCustomer = adminCustRes.body.data;
  });

  afterAll(async () => {
    for (const [id, role] of pendingCleanup.entries()) {
      const token = await login(role);
      await api.delete(`/api/customers/${id}`).set(auth(token));
    }
  });

  describe('Ciclo completo y asignación/protección de userId', () => {
    test('ciclo completo: crear sin userId (201), consultar por id (200), listar con admin/seller (200), actualizar protegiendo userId (200) y confirmar con GET, eliminar (200) y GET da 404', async () => {
      const email = `cust.lifecycle.${suffix}@stride.example`;

      // 1. Crear sin userId en el body (201): lo toma del token
      const createRes = trackCustomer(
        await api
          .post('/api/customers')
          .set(auth(tokens.admin))
          .send({
            email,
            phone: '6142000001',
            addresses: [
              {
                type: 'SHIPPING',
                street: 'Av. Universidad',
                number: '100',
                city: 'Chihuahua',
                state: 'Chihuahua',
                zipCode: '31000',
                country: 'México'
              }
            ]
          }),
        'admin'
      );

      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.message).toBe(en.customers.created);
      expect(createRes.body.data).toMatchObject({
        userId: usersMe.admin.id,
        email,
        phone: '6142000001'
      });
      expect(createRes.body.data).toHaveProperty('_id');

      const lifecycleCustomer = createRes.body.data;

      // 2. Consultar por id (200)
      const findRes = await api
        .get(`/api/customers/${lifecycleCustomer._id}`)
        .set(auth(tokens.admin));

      expect(findRes.statusCode).toBe(200);
      expect(findRes.body.message).toBe(en.customers.found);
      expect(findRes.body.data).toMatchObject({
        _id: lifecycleCustomer._id,
        userId: usersMe.admin.id,
        email,
        phone: '6142000001'
      });

      // 3. Listar con admin y seller (200 e incluir el creado)
      for (const role of ['admin', 'seller']) {
        const listRes = await api
          .get('/api/customers')
          .set(auth(tokens[role]));

        expect(listRes.statusCode).toBe(200);
        expect(listRes.body.message).toBe(en.customers.list);
        expect(Array.isArray(listRes.body.data)).toBe(true);

        const found = listRes.body.data.find((c) => c._id === lifecycleCustomer._id);
        expect(found).toBeDefined();
        expect(found.userId).toBe(usersMe.admin.id);
      }

      // 4. Actualizar (200), confirmar con GET y verificar que no cambie userId (directo, $set o ruta con punto)
      const updatedPhone = '6149998877';

      const putRes = await api
        .put(`/api/customers/${lifecycleCustomer._id}`)
        .set(auth(tokens.admin))
        .send({
          phone: updatedPhone,
          userId: usersMe.user.id,
          $set: { userId: usersMe.user.id },
          'userId.nested': usersMe.user.id
        });

      expect(putRes.statusCode).toBe(200);
      expect(putRes.body.message).toBe(en.customers.updated);
      expect(putRes.body.data.phone).toBe(updatedPhone);
      expect(putRes.body.data.userId).toBe(usersMe.admin.id);

      // Si solo se envían intentos de cambiar userId, responde 400
      const onlyRestrictedRes = await api
        .put(`/api/customers/${lifecycleCustomer._id}`)
        .set(auth(tokens.admin))
        .send({
          userId: usersMe.user.id,
          $set: { userId: usersMe.user.id },
          'userId.nested': usersMe.user.id
        });

      expect(onlyRestrictedRes.statusCode).toBe(400);
      expect(onlyRestrictedRes.body).toEqual({ message: en.common.invalidBody });

      const confirmGetRes = await api
        .get(`/api/customers/${lifecycleCustomer._id}`)
        .set(auth(tokens.admin));

      expect(confirmGetRes.statusCode).toBe(200);
      expect(confirmGetRes.body.data.phone).toBe(updatedPhone);
      expect(confirmGetRes.body.data.userId).toBe(usersMe.admin.id);

      // 5. Eliminar (200) y GET da 404
      const delRes = await api
        .delete(`/api/customers/${lifecycleCustomer._id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body).toEqual({
        message: en.customers.deleted,
        data: { id: lifecycleCustomer._id }
      });
      pendingCleanup.delete(lifecycleCustomer._id);

      const afterDelRes = await api
        .get(`/api/customers/${lifecycleCustomer._id}`)
        .set(auth(tokens.admin));

      expect(afterDelRes.statusCode).toBe(404);
      expect(afterDelRes.body).toEqual({ message: en.customers.notFound });
    });

    test('POST /api/customers ignora un userId enviado en el body y persiste el del token', async () => {
      const email = `cust.ignored.userid.${suffix}@stride.example`;
      const res = trackCustomer(
        await api
          .post('/api/customers')
          .set(auth(tokens.user))
          .send({
            userId: usersMe.admin.id,
            email,
            phone: '6142000002'
          }),
        'user'
      );

      expect(res.statusCode).toBe(201);
      expect(res.body.data.userId).toBe(usersMe.user.id);
      expect(res.body.data.userId).not.toBe(usersMe.admin.id);

      const getRes = await api
        .get(`/api/customers/${res.body.data._id}`)
        .set(auth(tokens.user));
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data.userId).toBe(usersMe.user.id);
    });
  });

  describe('Cada rol crea, actualiza y borra sus propios customers con su token', () => {
    test.each(['admin', 'seller', 'user'])(
      '%s puede crear (201), consultar (200), actualizar (200) y borrar (200) su propio customer',
      async (role) => {
        const token = tokens[role];
        const expectedUserId = usersMe[role].id;
        const email = `cust.own.${role}.${Date.now()}@stride.example`;

        const createRes = trackCustomer(
          await api
            .post('/api/customers')
            .set(auth(token))
            .send({ email, phone: '6143000001' }),
          role
        );

        expect(createRes.statusCode).toBe(201);
        const created = createRes.body.data;
        expect(created.userId).toBe(expectedUserId);

        const getRes = await api
          .get(`/api/customers/${created._id}`)
          .set(auth(token));
        expect(getRes.statusCode).toBe(200);
        expect(getRes.body.data._id).toBe(created._id);

        const putRes = await api
          .put(`/api/customers/${created._id}`)
          .set(auth(token))
          .send({ phone: '6143009999' });
        expect(putRes.statusCode).toBe(200);
        expect(putRes.body.data.phone).toBe('6143009999');
        expect(putRes.body.data.userId).toBe(expectedUserId);

        const delRes = await api
          .delete(`/api/customers/${created._id}`)
          .set(auth(token));
        expect(delRes.statusCode).toBe(200);
        expect(delRes.body).toEqual({
          message: en.customers.deleted,
          data: { id: created._id }
        });
        pendingCleanup.delete(created._id);

        const afterDelRes = await api
          .get(`/api/customers/${created._id}`)
          .set(auth(tokens.admin));
        expect(afterDelRes.statusCode).toBe(404);
      }
    );
  });

  describe('Restricciones de acceso para user (403)', () => {
    test('user recibe 403 al intentar listar todos los customers', async () => {
      const res = await api
        .get('/api/customers')
        .set(auth(tokens.user));

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: en.auth.forbidden });
    });

    test('user recibe 403 al intentar ver, editar o borrar el customer de otro usuario', async () => {
      const getRes = await api
        .get(`/api/customers/${adminOwnedCustomer._id}`)
        .set(auth(tokens.user));
      expect(getRes.statusCode).toBe(403);
      expect(getRes.body).toEqual({ message: en.auth.forbidden });

      const putRes = await api
        .put(`/api/customers/${adminOwnedCustomer._id}`)
        .set(auth(tokens.user))
        .send({ phone: '6140000000' });
      expect(putRes.statusCode).toBe(403);
      expect(putRes.body).toEqual({ message: en.auth.forbidden });

      const delRes = await api
        .delete(`/api/customers/${adminOwnedCustomer._id}`)
        .set(auth(tokens.user));
      expect(delRes.statusCode).toBe(403);
      expect(delRes.body).toEqual({ message: en.auth.forbidden });
    });
  });

  describe('Validaciones de id e inexistencia (400 / 404)', () => {
    test('GET, PUT y DELETE /api/customers/:id con id inválido responden 400', async () => {
      const getRes = await api
        .get('/api/customers/id-invalido')
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(400);
      expect(getRes.body).toEqual({ message: en.common.invalidId });

      const putRes = await api
        .put('/api/customers/id-invalido')
        .set(auth(tokens.admin))
        .send({ phone: '6141112222' });
      expect(putRes.statusCode).toBe(400);
      expect(putRes.body).toEqual({ message: en.common.invalidId });

      const delRes = await api
        .delete('/api/customers/id-invalido')
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(400);
      expect(delRes.body).toEqual({ message: en.common.invalidId });
    });

    test('GET, PUT y DELETE /api/customers/:id con id inexistente responden 404', async () => {
      const getRes = await api
        .get(`/api/customers/${NON_EXISTENT_OBJECT_ID}`)
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.customers.notFound });

      const putRes = await api
        .put(`/api/customers/${NON_EXISTENT_OBJECT_ID}`)
        .set(auth(tokens.admin))
        .send({ phone: '6141112222' });
      expect(putRes.statusCode).toBe(404);
      expect(putRes.body).toEqual({ message: en.customers.notFound });

      const delRes = await api
        .delete(`/api/customers/${NON_EXISTENT_OBJECT_ID}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(404);
      expect(delRes.body).toEqual({ message: en.customers.notFound });
    });
  });
});
