const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

describe('RBAC E2E', () => {
  const suffix = Date.now();
  const tokens = {};

  let testProduct = null;
  let extraProductId = null;
  let adminCustomer = null;
  let adminOrder = null;
  let sellerCustomer = null;
  let sellerOrder = null;
  let userCustomer = null;
  let userOrder = null;

  beforeAll(async () => {
    tokens.admin = await login('admin');
    tokens.seller = await login('seller');
    tokens.user = await login('user');

    // Producto de prueba creado con admin para no tocar datos demo del seed
    const prodRes = await api
      .post('/api/products')
      .set(auth(tokens.admin))
      .send({
        name: `Tenis RBAC ${suffix}`,
        brand: 'Stride E2E',
        description: 'Producto temporal para pruebas RBAC',
        price: 799.5,
        active: true
      });
    expect(prodRes.statusCode).toBe(201);
    testProduct = prodRes.body.data;

    // Cliente y orden propios de admin
    const adminCustRes = await api
      .post('/api/customers')
      .set(auth(tokens.admin))
      .send({
        email: `rbac.admin.${suffix}@stride.example`,
        phone: '6141000001'
      });
    expect(adminCustRes.statusCode).toBe(201);
    adminCustomer = adminCustRes.body.data;

    const adminOrdRes = await api
      .post('/api/orders')
      .set(auth(tokens.admin))
      .send({
        customerId: adminCustomer._id,
        paymentMethod: 'CASH',
        items: [{ productId: testProduct.id, quantity: 1, unitPrice: '799.50' }],
        totals: { subtotal: '799.50', total: '799.50' }
      });
    expect(adminOrdRes.statusCode).toBe(201);
    adminOrder = adminOrdRes.body.data;

    // Cliente y orden propios de user
    const userCustRes = await api
      .post('/api/customers')
      .set(auth(tokens.user))
      .send({
        email: `rbac.user.${suffix}@stride.example`,
        phone: '6141000002'
      });
    expect(userCustRes.statusCode).toBe(201);
    userCustomer = userCustRes.body.data;

    const userOrdRes = await api
      .post('/api/orders')
      .set(auth(tokens.user))
      .send({
        customerId: userCustomer._id,
        paymentMethod: 'CARD',
        items: [{ productId: testProduct.id, quantity: 1, unitPrice: '799.50' }],
        totals: { subtotal: '799.50', total: '799.50' }
      });
    expect(userOrdRes.statusCode).toBe(201);
    userOrder = userOrdRes.body.data;
  });

  afterAll(async () => {
    const adminToken = await login('admin');
    const sellerToken = await login('seller');
    const userToken = await login('user');

    // Limpieza con el token del dueño de cada registro
    if (sellerOrder && sellerOrder._id) {
      await api.delete(`/api/orders/${sellerOrder._id}`).set(auth(sellerToken));
    }
    if (sellerCustomer && sellerCustomer._id) {
      await api.delete(`/api/customers/${sellerCustomer._id}`).set(auth(sellerToken));
    }
    if (userOrder && userOrder._id) {
      await api.delete(`/api/orders/${userOrder._id}`).set(auth(userToken));
    }
    if (userCustomer && userCustomer._id) {
      await api.delete(`/api/customers/${userCustomer._id}`).set(auth(userToken));
    }
    if (adminOrder && adminOrder._id) {
      await api.delete(`/api/orders/${adminOrder._id}`).set(auth(adminToken));
    }
    if (adminCustomer && adminCustomer._id) {
      await api.delete(`/api/customers/${adminCustomer._id}`).set(auth(adminToken));
    }
    if (extraProductId) {
      await api.delete(`/api/products/${extraProductId}`).set(auth(adminToken));
    }
    if (testProduct && testProduct.id) {
      await api.delete(`/api/products/${testProduct.id}`).set(auth(adminToken));
    }
  });

  describe('1. admin: acceso :any a los 8 recursos, pero update/delete :own en customers y orders', () => {
    test.each([
      '/api/products',
      '/api/orders',
      '/api/users',
      '/api/customers',
      '/api/roles',
      '/api/permissions',
      '/api/variants',
      '/api/inventory'
    ])('admin puede listar %s (:read:any)', async (endpoint) => {
      const res = await api.get(endpoint).set(auth(tokens.admin));
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('admin puede crear y eliminar un producto (:create:any y :delete:any)', async () => {
      const createRes = await api
        .post('/api/products')
        .set(auth(tokens.admin))
        .send({ name: `Tenis Temporal ${suffix}`, price: 450 });

      expect(createRes.statusCode).toBe(201);
      extraProductId = createRes.body.data.id;

      const deleteRes = await api
        .delete(`/api/products/${extraProductId}`)
        .set(auth(tokens.admin));

      expect(deleteRes.statusCode).toBe(200);
      extraProductId = null;
    });

    test('admin puede leer el customer y la order de otro usuario (:read:any)', async () => {
      const custRes = await api
        .get(`/api/customers/${userCustomer._id}`)
        .set(auth(tokens.admin));
      expect(custRes.statusCode).toBe(200);

      const ordRes = await api
        .get(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.admin));
      expect(ordRes.statusCode).toBe(200);
    });

    test('admin puede actualizar su propio customer y su propia order (:update:own)', async () => {
      const custRes = await api
        .put(`/api/customers/${adminCustomer._id}`)
        .set(auth(tokens.admin))
        .send({ phone: '6149990001' });
      expect(custRes.statusCode).toBe(200);

      const ordRes = await api
        .put(`/api/orders/${adminOrder._id}`)
        .set(auth(tokens.admin))
        .send({ paymentMethod: 'TRANSFER' });
      expect(ordRes.statusCode).toBe(200);
    });

    test('admin recibe 403 al intentar actualizar o borrar un customer de otro usuario', async () => {
      const putRes = await api
        .put(`/api/customers/${userCustomer._id}`)
        .set(auth(tokens.admin))
        .send({ phone: '6140009999' });
      expect(putRes.statusCode).toBe(403);
      expect(putRes.body).toEqual({ message: en.auth.forbidden });

      const delRes = await api
        .delete(`/api/customers/${userCustomer._id}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(403);
      expect(delRes.body).toEqual({ message: en.auth.forbidden });
    });

    test('admin recibe 403 al intentar actualizar o borrar una order de otro usuario', async () => {
      const putRes = await api
        .put(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.admin))
        .send({ paymentMethod: 'CASH' });
      expect(putRes.statusCode).toBe(403);
      expect(putRes.body).toEqual({ message: en.auth.forbidden });

      const delRes = await api
        .delete(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(403);
      expect(delRes.body).toEqual({ message: en.auth.forbidden });
    });
  });

  describe('2. seller: accede a lo permitido en la matriz del seed y recibe 403 en lo demás', () => {
    test.each([
      '/api/products',
      '/api/variants',
      '/api/inventory',
      '/api/customers',
      '/api/orders'
    ])('seller puede listar %s según la matriz del seed', async (endpoint) => {
      const res = await api.get(endpoint).set(auth(tokens.seller));
      expect(res.statusCode).toBe(200);
    });

    test('seller puede consultar el customer y la order de otro usuario (:read:any)', async () => {
      const custRes = await api
        .get(`/api/customers/${userCustomer._id}`)
        .set(auth(tokens.seller));
      expect(custRes.statusCode).toBe(200);

      const ordRes = await api
        .get(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.seller));
      expect(ordRes.statusCode).toBe(200);
    });

    test('seller crea un customer y una order propios y puede actualizarlos (200) y borrarlos (200)', async () => {
      const createCustRes = await api
        .post('/api/customers')
        .set(auth(tokens.seller))
        .send({
          email: `rbac.seller.${suffix}@stride.example`,
          phone: '6141000003'
        });
      expect(createCustRes.statusCode).toBe(201);
      sellerCustomer = createCustRes.body.data;

      const createOrdRes = await api
        .post('/api/orders')
        .set(auth(tokens.seller))
        .send({
          customerId: sellerCustomer._id,
          paymentMethod: 'CASH',
          items: [{ productId: testProduct.id, quantity: 1, unitPrice: '799.50' }],
          totals: { subtotal: '799.50', total: '799.50' }
        });
      expect(createOrdRes.statusCode).toBe(201);
      sellerOrder = createOrdRes.body.data;

      const putCustRes = await api
        .put(`/api/customers/${sellerCustomer._id}`)
        .set(auth(tokens.seller))
        .send({ phone: '6148880003' });
      expect(putCustRes.statusCode).toBe(200);

      const putOrdRes = await api
        .put(`/api/orders/${sellerOrder._id}`)
        .set(auth(tokens.seller))
        .send({ paymentMethod: 'TRANSFER' });
      expect(putOrdRes.statusCode).toBe(200);

      const delOrdRes = await api
        .delete(`/api/orders/${sellerOrder._id}`)
        .set(auth(tokens.seller));
      expect(delOrdRes.statusCode).toBe(200);
      sellerOrder = null;

      const delCustRes = await api
        .delete(`/api/customers/${sellerCustomer._id}`)
        .set(auth(tokens.seller));
      expect(delCustRes.statusCode).toBe(200);
      sellerCustomer = null;
    });

    test('seller recibe 403 al intentar actualizar o borrar el customer y la order de otro usuario', async () => {
      const putCustRes = await api
        .put(`/api/customers/${userCustomer._id}`)
        .set(auth(tokens.seller))
        .send({ phone: '6140007777' });
      expect(putCustRes.statusCode).toBe(403);
      expect(putCustRes.body).toEqual({ message: en.auth.forbidden });

      const delCustRes = await api
        .delete(`/api/customers/${userCustomer._id}`)
        .set(auth(tokens.seller));
      expect(delCustRes.statusCode).toBe(403);
      expect(delCustRes.body).toEqual({ message: en.auth.forbidden });

      const putOrdRes = await api
        .put(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.seller))
        .send({ paymentMethod: 'CASH' });
      expect(putOrdRes.statusCode).toBe(403);
      expect(putOrdRes.body).toEqual({ message: en.auth.forbidden });

      const delOrdRes = await api
        .delete(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.seller));
      expect(delOrdRes.statusCode).toBe(403);
      expect(delOrdRes.body).toEqual({ message: en.auth.forbidden });
    });

    test.each([
      '/api/users',
      '/api/roles',
      '/api/permissions'
    ])('seller recibe 403 al consultar %s', async (endpoint) => {
      const res = await api.get(endpoint).set(auth(tokens.seller));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: en.auth.forbidden });
    });

    test('seller recibe 403 al intentar crear, actualizar o eliminar productos', async () => {
      const postRes = await api
        .post('/api/products')
        .set(auth(tokens.seller))
        .send({ name: `No permitido ${suffix}`, price: 100 });
      expect(postRes.statusCode).toBe(403);

      const putRes = await api
        .put(`/api/products/${testProduct.id}`)
        .set(auth(tokens.seller))
        .send({ price: 200 });
      expect(putRes.statusCode).toBe(403);

      const delRes = await api
        .delete(`/api/products/${testProduct.id}`)
        .set(auth(tokens.seller));
      expect(delRes.statusCode).toBe(403);
      expect(delRes.body).toEqual({ message: en.auth.forbidden });
    });
  });

  describe('3. user: solo accede a sus propios recursos (own) y recibe 403 en recursos ajenos', () => {
    test('user puede ver y actualizar su propio customer (customers:read:own y customers:update:own)', async () => {
      const getRes = await api
        .get(`/api/customers/${userCustomer._id}`)
        .set(auth(tokens.user));
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data._id).toBe(userCustomer._id);

      const putRes = await api
        .put(`/api/customers/${userCustomer._id}`)
        .set(auth(tokens.user))
        .send({ phone: '6142223333' });
      expect(putRes.statusCode).toBe(200);
    });

    test('user puede ver y actualizar su propia order (orders:read:own y orders:update:own)', async () => {
      const getRes = await api
        .get(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.user));
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data._id).toBe(userOrder._id);

      const putRes = await api
        .put(`/api/orders/${userOrder._id}`)
        .set(auth(tokens.user))
        .send({ paymentMethod: 'TRANSFER' });
      expect(putRes.statusCode).toBe(200);
    });

    test('user recibe 403 al leer, actualizar o borrar el customer de otro usuario', async () => {
      const getRes = await api
        .get(`/api/customers/${adminCustomer._id}`)
        .set(auth(tokens.user));
      expect(getRes.statusCode).toBe(403);
      expect(getRes.body).toEqual({ message: en.auth.forbidden });

      const putRes = await api
        .put(`/api/customers/${adminCustomer._id}`)
        .set(auth(tokens.user))
        .send({ phone: '6140000000' });
      expect(putRes.statusCode).toBe(403);

      const delRes = await api
        .delete(`/api/customers/${adminCustomer._id}`)
        .set(auth(tokens.user));
      expect(delRes.statusCode).toBe(403);
    });

    test('user recibe 403 al leer, actualizar o borrar la order de otro usuario', async () => {
      const getRes = await api
        .get(`/api/orders/${adminOrder._id}`)
        .set(auth(tokens.user));
      expect(getRes.statusCode).toBe(403);
      expect(getRes.body).toEqual({ message: en.auth.forbidden });

      const putRes = await api
        .put(`/api/orders/${adminOrder._id}`)
        .set(auth(tokens.user))
        .send({ paymentMethod: 'CASH' });
      expect(putRes.statusCode).toBe(403);

      const delRes = await api
        .delete(`/api/orders/${adminOrder._id}`)
        .set(auth(tokens.user));
      expect(delRes.statusCode).toBe(403);
    });
  });

  describe('4. sin token responde 401', () => {
    test.each([
      ['GET', '/api/products'],
      ['GET', '/api/orders'],
      ['GET', '/api/customers'],
      ['GET', '/api/users'],
      ['GET', '/api/roles'],
      ['GET', '/api/permissions'],
      ['GET', '/api/variants'],
      ['GET', '/api/inventory']
    ])('%s %s sin token devuelve 401', async (method, endpoint) => {
      const res = await api[method.toLowerCase()](endpoint);
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: en.auth.unauthorized });
    });
  });

  describe('5. rol sin permiso para la acción responde 403', () => {
    test('user sin orders:read:any recibe 403 al listar todas las órdenes', async () => {
      const res = await api.get('/api/orders').set(auth(tokens.user));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: en.auth.forbidden });
    });

    test('user sin customers:read:any recibe 403 al listar todos los clientes', async () => {
      const res = await api.get('/api/customers').set(auth(tokens.user));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: en.auth.forbidden });
    });

    test('user sin inventory:read:any recibe 403 al consultar inventario', async () => {
      const res = await api.get('/api/inventory').set(auth(tokens.user));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: en.auth.forbidden });
    });

    test('user sin products:create:any recibe 403 al intentar crear un producto', async () => {
      const res = await api
        .post('/api/products')
        .set(auth(tokens.user))
        .send({ name: `Denegado ${suffix}`, price: 100 });
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: en.auth.forbidden });
    });
  });
});
