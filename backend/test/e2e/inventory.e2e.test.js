const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

describe('Inventory API E2E (/api/inventory)', () => {
  const suffix = Date.now();
  const tokens = {};
  const createdInventoryIds = new Set();

  let testProduct = null;
  let testVariant = null;
  let createdInventory = null;

  beforeAll(async () => {
    tokens.admin = await login('admin');
    tokens.seller = await login('seller');
    tokens.user = await login('user');

    const prodRes = await api
      .post('/api/products')
      .set(auth(tokens.admin))
      .send({
        name: `Producto Inventario E2E ${suffix}`,
        price: 1100,
        brand: 'Stride E2E',
        description: `Producto temporal para pruebas de inventario ${suffix}`,
        active: true
      });

    expect(prodRes.statusCode).toBe(201);
    testProduct = prodRes.body.data;

    const varRes = await api
      .post('/api/variants')
      .set(auth(tokens.admin))
      .send({
        product_id: testProduct.id,
        sku: `SKU-INV-E2E-${suffix}`,
        size: '27 MX',
        color: 'Negro',
        active: true
      });

    expect(varRes.statusCode).toBe(201);
    testVariant = varRes.body.data;
  });

  afterAll(async () => {
    const adminToken = await login('admin');

    for (const id of createdInventoryIds) {
      await api.delete(`/api/inventory/${id}`).set(auth(adminToken));
    }

    if (testVariant && testVariant.id) {
      await api.delete(`/api/variants/${testVariant.id}`).set(auth(adminToken));
    }

    if (testProduct && testProduct.id) {
      await api.delete(`/api/products/${testProduct.id}`).set(auth(adminToken));
    }
  });

  describe('Ciclo completo con admin', () => {
    test('POST /api/inventory crea un registro de inventario (201)', async () => {
      const res = await api
        .post('/api/inventory')
        .set(auth(tokens.admin))
        .send({
          variant_id: testVariant.id,
          stock: 40,
          reserved: 5
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe(en.inventory.created);
      expect(res.body.data).toMatchObject({
        variant_id: testVariant.id,
        stock: 40,
        reserved: 5
      });
      expect(res.body.data).toHaveProperty('id');

      createdInventory = res.body.data;
      createdInventoryIds.add(createdInventory.id);
    });

    test('GET /api/inventory/:id consulta el inventario creado (200)', async () => {
      const res = await api
        .get(`/api/inventory/${createdInventory.id}`)
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.inventory.found);
      expect(res.body.data).toMatchObject({
        id: createdInventory.id,
        variant_id: testVariant.id,
        stock: 40,
        reserved: 5
      });
    });

    test('GET /api/inventory lista inventario (200) e incluye el creado', async () => {
      const res = await api
        .get('/api/inventory')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.inventory.list);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((item) => item.id === createdInventory.id);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        id: createdInventory.id,
        variant_id: testVariant.id,
        stock: 40,
        reserved: 5
      });
    });

    test('PUT /api/inventory/:id actualiza el inventario (200) y se confirma con GET', async () => {
      const putRes = await api
        .put(`/api/inventory/${createdInventory.id}`)
        .set(auth(tokens.admin))
        .send({
          stock: 75,
          reserved: 10
        });

      expect(putRes.statusCode).toBe(200);
      expect(putRes.body.message).toBe(en.inventory.updated);
      expect(putRes.body.data).toMatchObject({
        id: createdInventory.id,
        variant_id: testVariant.id,
        stock: 75,
        reserved: 10
      });

      const getRes = await api
        .get(`/api/inventory/${createdInventory.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject({
        id: createdInventory.id,
        variant_id: testVariant.id,
        stock: 75,
        reserved: 10
      });
    });

    test('DELETE /api/inventory/:id elimina el inventario (200) y un GET posterior responde 404', async () => {
      const delRes = await api
        .delete(`/api/inventory/${createdInventory.id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.message).toBe(en.inventory.deleted);
      createdInventoryIds.delete(createdInventory.id);

      const getRes = await api
        .get(`/api/inventory/${createdInventory.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.inventory.notFound });
    });
  });

  describe('Validaciones y casos de error (400 / 404)', () => {
    test('POST /api/inventory con variant_id repetido responde 400', async () => {
      const firstRes = await api
        .post('/api/inventory')
        .set(auth(tokens.admin))
        .send({
          variant_id: testVariant.id,
          stock: 20,
          reserved: 2
        });

      expect(firstRes.statusCode).toBe(201);
      if (firstRes.body?.data?.id) {
        createdInventoryIds.add(firstRes.body.data.id);
      }

      const secondRes = await api
        .post('/api/inventory')
        .set(auth(tokens.admin))
        .send({
          variant_id: testVariant.id,
          stock: 30,
          reserved: 3
        });

      if (secondRes.body?.data?.id) {
        createdInventoryIds.add(secondRes.body.data.id);
      }

      expect(secondRes.statusCode).toBe(400);
      expect(secondRes.body).toEqual({ message: en.common.duplicate });
    });

    test('POST /api/inventory con datos inválidos responde 400', async () => {
      const missingVariantIdRes = await api
        .post('/api/inventory')
        .set(auth(tokens.admin))
        .send({ stock: 10, reserved: 0 });

      expect(missingVariantIdRes.statusCode).toBe(400);
      expect(missingVariantIdRes.body).toEqual({ message: en.inventory.variantIdRequired });

      const negativeStockRes = await api
        .post('/api/inventory')
        .set(auth(tokens.admin))
        .send({ variant_id: testVariant.id, stock: -5, reserved: 0 });

      expect(negativeStockRes.statusCode).toBe(400);
      expect(negativeStockRes.body).toEqual({ message: en.inventory.stockRequired });

      const negativeReservedRes = await api
        .post('/api/inventory')
        .set(auth(tokens.admin))
        .send({ variant_id: testVariant.id, stock: 10, reserved: -1 });

      expect(negativeReservedRes.statusCode).toBe(400);
      expect(negativeReservedRes.body).toEqual({ message: en.inventory.reservedRequired });
    });

    test('GET /api/inventory/:id con id mal formado responde 400', async () => {
      const res = await api
        .get('/api/inventory/id-invalido')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.common.invalidId });
    });

    test('GET, PUT y DELETE /api/inventory/:id con id inexistente responden 404', async () => {
      const nonExistentId = 999999;

      const getRes = await api
        .get(`/api/inventory/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.inventory.notFound });

      const putRes = await api
        .put(`/api/inventory/${nonExistentId}`)
        .set(auth(tokens.admin))
        .send({ stock: 15 });
      expect(putRes.statusCode).toBe(404);
      expect(putRes.body).toEqual({ message: en.inventory.notFound });

      const delRes = await api
        .delete(`/api/inventory/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(404);
      expect(delRes.body).toEqual({ message: en.inventory.notFound });
    });
  });

  describe('Control de acceso: user recibe 403', () => {
    test('user recibe 403 en GET, POST, PUT y DELETE /api/inventory', async () => {
      const listRes = await api.get('/api/inventory').set(auth(tokens.user));
      expect(listRes.statusCode).toBe(403);
      expect(listRes.body).toEqual({ message: en.auth.forbidden });

      const findRes = await api.get('/api/inventory/1').set(auth(tokens.user));
      expect(findRes.statusCode).toBe(403);
      expect(findRes.body).toEqual({ message: en.auth.forbidden });

      const createRes = await api
        .post('/api/inventory')
        .set(auth(tokens.user))
        .send({
          variant_id: testVariant.id,
          stock: 10,
          reserved: 0
        });
      expect(createRes.statusCode).toBe(403);
      expect(createRes.body).toEqual({ message: en.auth.forbidden });

      const updateRes = await api
        .put('/api/inventory/1')
        .set(auth(tokens.user))
        .send({ stock: 25 });
      expect(updateRes.statusCode).toBe(403);
      expect(updateRes.body).toEqual({ message: en.auth.forbidden });

      const deleteRes = await api.delete('/api/inventory/1').set(auth(tokens.user));
      expect(deleteRes.statusCode).toBe(403);
      expect(deleteRes.body).toEqual({ message: en.auth.forbidden });
    });
  });
});
