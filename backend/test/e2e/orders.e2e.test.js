const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

const NON_EXISTENT_OBJECT_ID = '0123456789abcdef01234567';

describe('Orders API E2E (/api/orders)', () => {
  const suffix = Date.now();
  const tokens = {};
  const usersMe = {};
  const pendingOrders = new Map();
  const pendingCustomers = new Map();

  let productId = 1;
  let ownerCustomer = null;
  let otherCustomer = null;

  function trackOrder(res, role) {
    if (res.body?.data?._id) {
      pendingOrders.set(res.body.data._id, role);
    }
    return res;
  }

  function trackCustomer(res, role) {
    if (res.body?.data?._id) {
      pendingCustomers.set(res.body.data._id, role);
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

    const prodListRes = await api.get('/api/products').set(auth(tokens.admin));
    expect(prodListRes.statusCode).toBe(200);
    if (Array.isArray(prodListRes.body.data) && prodListRes.body.data.length > 0) {
      productId = prodListRes.body.data[0].id;
    }

    // Customer creado con el mismo usuario (admin) que hará el ciclo completo de la orden
    const ownerCustRes = trackCustomer(
      await api
        .post('/api/customers')
        .set(auth(tokens.admin))
        .send({
          email: `orders.owner.${suffix}@stride.example`,
          phone: '6144000001'
        }),
      'admin'
    );
    expect(ownerCustRes.statusCode).toBe(201);
    ownerCustomer = ownerCustRes.body.data;

    // Customer de otro usuario (user) para probar que PUT no cambie customerId
    const otherCustRes = trackCustomer(
      await api
        .post('/api/customers')
        .set(auth(tokens.user))
        .send({
          email: `orders.other.${suffix}@stride.example`,
          phone: '6144000002'
        }),
      'user'
    );
    expect(otherCustRes.statusCode).toBe(201);
    otherCustomer = otherCustRes.body.data;
  });

  afterAll(async () => {
    // Primero se borran las órdenes con el token de su dueño
    for (const [id, role] of pendingOrders.entries()) {
      const token = await login(role);
      await api.delete(`/api/orders/${id}`).set(auth(token));
    }

    // Después se borran los customers con el token de su dueño
    for (const [id, role] of pendingCustomers.entries()) {
      const token = await login(role);
      await api.delete(`/api/customers/${id}`).set(auth(token));
    }
  });

  describe('Ciclo completo y reglas de negocio en órdenes', () => {
    test('ciclo completo: crear con montos decimales y statusHistory PENDING forzado por servidor (201), consultar por id (200), listar (200), actualizar protegiendo userId/customerId/statusHistory (200) y confirmar con GET, eliminar (200) y GET da 404', async () => {
      // 1. Crear (201)
      const createRes = trackOrder(
        await api
          .post('/api/orders')
          .set(auth(tokens.admin))
          .send({
            customerId: ownerCustomer._id,
            paymentMethod: 'CASH',
            items: [
              {
                productId,
                quantity: 2,
                unitPrice: '450.50'
              }
            ],
            totals: {
              subtotal: '901.00',
              shipping: '0.00',
              discount: '0.00',
              total: '901.00'
            },
            statusHistory: [
              {
                status: 'DELIVERED',
                changedById: 999999,
                note: 'Estado falso enviado desde el cliente'
              }
            ]
          }),
        'admin'
      );

      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.message).toBe(en.orders.created);
      expect(createRes.body.data).toHaveProperty('_id');
      expect(createRes.body.data.customerId).toBe(ownerCustomer._id);
      expect(createRes.body.data.paymentMethod).toBe('CASH');

      // Montos serializados como { "$numberDecimal": "..." }
      expect(createRes.body.data.items).toHaveLength(1);
      expect(createRes.body.data.items[0]).toMatchObject({
        productId,
        quantity: 2,
        unitPrice: { $numberDecimal: '450.50' }
      });
      expect(createRes.body.data.totals).toMatchObject({
        subtotal: { $numberDecimal: '901.00' },
        shipping: { $numberDecimal: '0.00' },
        discount: { $numberDecimal: '0.00' },
        total: { $numberDecimal: '901.00' }
      });

      // El servidor ignora el statusHistory del body y asigna un único elemento PENDING
      expect(createRes.body.data.statusHistory).toHaveLength(1);
      expect(createRes.body.data.statusHistory[0]).toMatchObject({
        status: 'PENDING',
        changedById: usersMe.admin.id
      });
      expect(createRes.body.data.statusHistory[0]).not.toHaveProperty('note');

      const lifecycleOrder = createRes.body.data;

      // 2. Consultar por id (200)
      const findRes = await api
        .get(`/api/orders/${lifecycleOrder._id}`)
        .set(auth(tokens.admin));

      expect(findRes.statusCode).toBe(200);
      expect(findRes.body.message).toBe(en.orders.found);
      expect(findRes.body.data._id).toBe(lifecycleOrder._id);
      expect(findRes.body.data.customerId).toMatchObject({
        _id: ownerCustomer._id,
        userId: usersMe.admin.id,
        email: ownerCustomer.email
      });
      expect(findRes.body.data.items[0].unitPrice).toEqual({ $numberDecimal: '450.50' });
      expect(findRes.body.data.totals.subtotal).toEqual({ $numberDecimal: '901.00' });
      expect(findRes.body.data.totals.total).toEqual({ $numberDecimal: '901.00' });
      expect(findRes.body.data.statusHistory).toHaveLength(1);
      expect(findRes.body.data.statusHistory[0].status).toBe('PENDING');

      // 3. Listar (200 e incluir la creada)
      const listRes = await api
        .get('/api/orders')
        .set(auth(tokens.admin));

      expect(listRes.statusCode).toBe(200);
      expect(listRes.body.message).toBe(en.orders.list);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      const found = listRes.body.data.find((o) => o._id === lifecycleOrder._id);
      expect(found).toBeDefined();
      expect(found.totals.total).toEqual({ $numberDecimal: '901.00' });

      // 4. Actualizar (200), confirmar con GET y verificar que no cambie userId, customerId ni statusHistory
      const putRes = await api
        .put(`/api/orders/${lifecycleOrder._id}`)
        .set(auth(tokens.admin))
        .send({
          paymentMethod: 'TRANSFER',
          totals: {
            subtotal: '901.00',
            shipping: '99.00',
            discount: '0.00',
            total: '1000.00'
          },
          userId: usersMe.user.id,
          customerId: otherCustomer._id,
          statusHistory: [{ status: 'DELIVERED', changedById: usersMe.user.id }],
          $set: { customerId: otherCustomer._id },
          $push: { statusHistory: { status: 'PAID', changedById: usersMe.user.id } },
          'statusHistory.0.status': 'CANCELLED'
        });

      expect(putRes.statusCode).toBe(200);
      expect(putRes.body.message).toBe(en.orders.updated);
      expect(putRes.body.data.paymentMethod).toBe('TRANSFER');
      expect(putRes.body.data.customerId).toBe(ownerCustomer._id);
      expect(putRes.body.data).not.toHaveProperty('userId');
      expect(putRes.body.data.totals.total).toEqual({ $numberDecimal: '1000.00' });
      expect(putRes.body.data.statusHistory).toHaveLength(1);
      expect(putRes.body.data.statusHistory[0]).toMatchObject({
        status: 'PENDING',
        changedById: usersMe.admin.id
      });

      // Enviar únicamente campos restringidos devuelve 400
      const onlyRestrictedRes = await api
        .put(`/api/orders/${lifecycleOrder._id}`)
        .set(auth(tokens.admin))
        .send({
          userId: usersMe.user.id,
          customerId: otherCustomer._id,
          statusHistory: [{ status: 'DELIVERED', changedById: usersMe.user.id }]
        });

      expect(onlyRestrictedRes.statusCode).toBe(400);
      expect(onlyRestrictedRes.body).toEqual({ message: en.common.invalidBody });

      // Confirmación con GET
      const confirmGetRes = await api
        .get(`/api/orders/${lifecycleOrder._id}`)
        .set(auth(tokens.admin));

      expect(confirmGetRes.statusCode).toBe(200);
      expect(confirmGetRes.body.data.paymentMethod).toBe('TRANSFER');
      expect(confirmGetRes.body.data.customerId._id).toBe(ownerCustomer._id);
      expect(confirmGetRes.body.data.customerId.userId).toBe(usersMe.admin.id);
      expect(confirmGetRes.body.data).not.toHaveProperty('userId');
      expect(confirmGetRes.body.data.totals.shipping).toEqual({ $numberDecimal: '99.00' });
      expect(confirmGetRes.body.data.totals.total).toEqual({ $numberDecimal: '1000.00' });
      expect(confirmGetRes.body.data.statusHistory).toHaveLength(1);
      expect(confirmGetRes.body.data.statusHistory[0].status).toBe('PENDING');

      // 5. Eliminar (200) y GET da 404
      const delRes = await api
        .delete(`/api/orders/${lifecycleOrder._id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body).toEqual({
        message: en.orders.deleted,
        data: { id: lifecycleOrder._id }
      });
      pendingOrders.delete(lifecycleOrder._id);

      const afterDelRes = await api
        .get(`/api/orders/${lifecycleOrder._id}`)
        .set(auth(tokens.admin));

      expect(afterDelRes.statusCode).toBe(404);
      expect(afterDelRes.body).toEqual({ message: en.orders.notFound });
    });
  });

  describe('Validaciones y casos de error (400 / 404 / 403)', () => {
    test('POST /api/orders con items vacío responde 400', async () => {
      const res = trackOrder(
        await api
          .post('/api/orders')
          .set(auth(tokens.admin))
          .send({
            customerId: ownerCustomer._id,
            paymentMethod: 'CARD',
            items: [],
            totals: {
              subtotal: '0.00',
              total: '0.00'
            }
          }),
        'admin'
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.common.validation });
    });

    test('POST /api/orders sin totals o con body vacío responde 400', async () => {
      const emptyBodyRes = trackOrder(
        await api
          .post('/api/orders')
          .set(auth(tokens.admin))
          .send({}),
        'admin'
      );
      expect(emptyBodyRes.statusCode).toBe(400);
      expect(emptyBodyRes.body).toEqual({ message: en.common.invalidBody });

      const missingTotalsRes = trackOrder(
        await api
          .post('/api/orders')
          .set(auth(tokens.admin))
          .send({
            customerId: ownerCustomer._id,
            items: [{ productId, quantity: 1, unitPrice: '100.00' }]
          }),
        'admin'
      );
      expect(missingTotalsRes.statusCode).toBe(400);
      expect(missingTotalsRes.body).toEqual({ message: en.common.validation });
    });

    test('GET, PUT y DELETE /api/orders/:id con id mal formado responden 400', async () => {
      const getRes = await api
        .get('/api/orders/id-invalido')
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(400);
      expect(getRes.body).toEqual({ message: en.common.invalidId });

      const putRes = await api
        .put('/api/orders/id-invalido')
        .set(auth(tokens.admin))
        .send({ paymentMethod: 'CASH' });
      expect(putRes.statusCode).toBe(400);
      expect(putRes.body).toEqual({ message: en.common.invalidId });

      const delRes = await api
        .delete('/api/orders/id-invalido')
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(400);
      expect(delRes.body).toEqual({ message: en.common.invalidId });
    });

    test('GET, PUT y DELETE /api/orders/:id con id inexistente responden 404', async () => {
      const getRes = await api
        .get(`/api/orders/${NON_EXISTENT_OBJECT_ID}`)
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.orders.notFound });

      const putRes = await api
        .put(`/api/orders/${NON_EXISTENT_OBJECT_ID}`)
        .set(auth(tokens.admin))
        .send({ paymentMethod: 'CASH' });
      expect(putRes.statusCode).toBe(404);
      expect(putRes.body).toEqual({ message: en.orders.notFound });

      const delRes = await api
        .delete(`/api/orders/${NON_EXISTENT_OBJECT_ID}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(404);
      expect(delRes.body).toEqual({ message: en.orders.notFound });
    });

    test('user no puede listar todas las órdenes (403) pero puede crear y borrar primero su orden y luego su customer con su propio token', async () => {
      const listRes = await api.get('/api/orders').set(auth(tokens.user));
      expect(listRes.statusCode).toBe(403);
      expect(listRes.body).toEqual({ message: en.auth.forbidden });

      // Crea su propio customer dedicado a esta prueba para no afectar otras pruebas
      const createCustRes = trackCustomer(
        await api
          .post('/api/customers')
          .set(auth(tokens.user))
          .send({
            email: `orders.user.flow.${Date.now()}@stride.example`,
            phone: '6144000099'
          }),
        'user'
      );
      expect(createCustRes.statusCode).toBe(201);
      const userCust = createCustRes.body.data;

      const createOrdRes = trackOrder(
        await api
          .post('/api/orders')
          .set(auth(tokens.user))
          .send({
            customerId: userCust._id,
            paymentMethod: 'CARD',
            items: [{ productId, quantity: 1, unitPrice: '250.00' }],
            totals: { subtotal: '250.00', total: '250.00' }
          }),
        'user'
      );
      expect(createOrdRes.statusCode).toBe(201);
      const userOrder = createOrdRes.body.data;

      // Primero borra la orden y confirma 404
      const delOrdRes = await api
        .delete(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.user));
      expect(delOrdRes.statusCode).toBe(200);
      expect(delOrdRes.body).toEqual({
        message: en.orders.deleted,
        data: { id: userOrder._id }
      });
      pendingOrders.delete(userOrder._id);

      const getOrdAfterDel = await api
        .get(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.admin));
      expect(getOrdAfterDel.statusCode).toBe(404);

      // Después borra el customer y confirma 404
      const delCustRes = await api
        .delete(`/api/customers/${userCust._id}`)
        .set(auth(tokens.user));
      expect(delCustRes.statusCode).toBe(200);
      expect(delCustRes.body).toEqual({
        message: en.customers.deleted,
        data: { id: userCust._id }
      });
      pendingCustomers.delete(userCust._id);

      const getCustAfterDel = await api
        .get(`/api/customers/${userCust._id}`)
        .set(auth(tokens.admin));
      expect(getCustAfterDel.statusCode).toBe(404);
    });
  });
});
