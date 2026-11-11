const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

describe('Inventory API E2E (/api/inventory)', () => {
  const suffix = Date.now();
  const tokens = {};
  const createdInventoryIds = new Set();
  const createdVariantIds = new Set();

  let testProduct = null;
  let lifecycleVariant = null;
  let duplicateTestVariant = null;

  function trackInventory(res) {
    if (res.body?.data?.id) {
      createdInventoryIds.add(res.body.data.id);
    }
    return res;
  }

  function trackVariant(res) {
    if (res.body?.data?.id) {
      createdVariantIds.add(res.body.data.id);
    }
    return res;
  }

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

    testProduct = prodRes.body?.data || null;
    expect(prodRes.statusCode).toBe(201);

    const varLifecycleRes = trackVariant(
      await api
        .post('/api/variants')
        .set(auth(tokens.admin))
        .send({
          product_id: testProduct.id,
          sku: `SKU-INV-LIFE-${suffix}`,
          size: '27 MX',
          color: 'Negro',
          active: true
        })
    );
    expect(varLifecycleRes.statusCode).toBe(201);
    lifecycleVariant = varLifecycleRes.body.data;

    const varDupRes = trackVariant(
      await api
        .post('/api/variants')
        .set(auth(tokens.admin))
        .send({
          product_id: testProduct.id,
          sku: `SKU-INV-DUP-${suffix}`,
          size: '28 MX',
          color: 'Blanco',
          active: true
        })
    );
    expect(varDupRes.statusCode).toBe(201);
    duplicateTestVariant = varDupRes.body.data;
  });

  afterAll(async () => {
    const adminToken = await login('admin');

    for (const id of createdInventoryIds) {
      await api.delete(`/api/inventory/${id}`).set(auth(adminToken));
    }

    for (const id of createdVariantIds) {
      await api.delete(`/api/variants/${id}`).set(auth(adminToken));
    }

    if (testProduct && testProduct.id) {
      await api.delete(`/api/products/${testProduct.id}`).set(auth(adminToken));
    }
  });

  describe('Ciclo completo con admin', () => {
    test('crear (201), consultar por id (200), listar (200), actualizar (200) y confirmar con GET, eliminar (200) y GET da 404', async () => {
      // 1. Crear (201)
      const createRes = trackInventory(
        await api
          .post('/api/inventory')
          .set(auth(tokens.admin))
          .send({
            variant_id: lifecycleVariant.id,
            stock: 40,
            reserved: 5
          })
      );

      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.message).toBe(en.inventory.created);
      expect(createRes.body.data).toMatchObject({
        variant_id: lifecycleVariant.id,
        stock: 40,
        reserved: 5
      });
      expect(createRes.body.data).toHaveProperty('id');

      const createdInventory = createRes.body.data;

      // 2. Consultar por id (200)
      const findRes = await api
        .get(`/api/inventory/${createdInventory.id}`)
        .set(auth(tokens.admin));

      expect(findRes.statusCode).toBe(200);
      expect(findRes.body.message).toBe(en.inventory.found);
      expect(findRes.body.data).toMatchObject({
        id: createdInventory.id,
        variant_id: lifecycleVariant.id,
        stock: 40,
        reserved: 5
      });

      // 3. Listar (200 e incluir el creado)
      const listRes = await api
        .get('/api/inventory')
        .set(auth(tokens.admin));

      expect(listRes.statusCode).toBe(200);
      expect(listRes.body.message).toBe(en.inventory.list);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      const found = listRes.body.data.find((item) => item.id === createdInventory.id);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        id: createdInventory.id,
        variant_id: lifecycleVariant.id,
        stock: 40,
        reserved: 5
      });

      // 4. Actualizar (200) y confirmar con GET
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
        variant_id: lifecycleVariant.id,
        stock: 75,
        reserved: 10
      });

      const confirmGetRes = await api
        .get(`/api/inventory/${createdInventory.id}`)
        .set(auth(tokens.admin));

      expect(confirmGetRes.statusCode).toBe(200);
      expect(confirmGetRes.body.data).toMatchObject({
        id: createdInventory.id,
        variant_id: lifecycleVariant.id,
        stock: 75,
        reserved: 10
      });

      // 5. Eliminar (200) y GET da 404
      const delRes = await api
        .delete(`/api/inventory/${createdInventory.id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.message).toBe(en.inventory.deleted);
      createdInventoryIds.delete(createdInventory.id);

      const afterDelRes = await api
        .get(`/api/inventory/${createdInventory.id}`)
        .set(auth(tokens.admin));

      expect(afterDelRes.statusCode).toBe(404);
      expect(afterDelRes.body).toEqual({ message: en.inventory.notFound });
    });
  });

  describe('Validaciones y casos de error (400 / 404)', () => {
    test('POST /api/inventory con variant_id repetido responde 400', async () => {
      const firstRes = trackInventory(
        await api
          .post('/api/inventory')
          .set(auth(tokens.admin))
          .send({
            variant_id: duplicateTestVariant.id,
            stock: 20,
            reserved: 2
          })
      );

      expect(firstRes.statusCode).toBe(201);

      const secondRes = trackInventory(
        await api
          .post('/api/inventory')
          .set(auth(tokens.admin))
          .send({
            variant_id: duplicateTestVariant.id,
            stock: 30,
            reserved: 3
          })
      );

      expect(secondRes.statusCode).toBe(400);
      expect(secondRes.body).toEqual({ message: en.common.duplicate });
    });

    test('POST /api/inventory con datos inválidos responde 400', async () => {
      const missingVariantIdRes = trackInventory(
        await api
          .post('/api/inventory')
          .set(auth(tokens.admin))
          .send({ stock: 10, reserved: 0 })
      );

      expect(missingVariantIdRes.statusCode).toBe(400);
      expect(missingVariantIdRes.body).toEqual({ message: en.inventory.variantIdRequired });

      const negativeStockRes = trackInventory(
        await api
          .post('/api/inventory')
          .set(auth(tokens.admin))
          .send({ variant_id: lifecycleVariant.id, stock: -5, reserved: 0 })
      );

      expect(negativeStockRes.statusCode).toBe(400);
      expect(negativeStockRes.body).toEqual({ message: en.inventory.stockRequired });

      const negativeReservedRes = trackInventory(
        await api
          .post('/api/inventory')
          .set(auth(tokens.admin))
          .send({ variant_id: lifecycleVariant.id, stock: 10, reserved: -1 })
      );

      expect(negativeReservedRes.statusCode).toBe(400);
      expect(negativeReservedRes.body).toEqual({ message: en.inventory.reservedRequired });
    });

    test('GET, PUT y DELETE /api/inventory/:id con id mal formado responden 400', async () => {
      const getRes = await api
        .get('/api/inventory/id-invalido')
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(400);
      expect(getRes.body).toEqual({ message: en.common.invalidId });

      const putRes = await api
        .put('/api/inventory/id-invalido')
        .set(auth(tokens.admin))
        .send({ stock: 10 });
      expect(putRes.statusCode).toBe(400);
      expect(putRes.body).toEqual({ message: en.common.invalidId });

      const delRes = await api
        .delete('/api/inventory/id-invalido')
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(400);
      expect(delRes.body).toEqual({ message: en.common.invalidId });
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

      const createRes = trackInventory(
        await api
          .post('/api/inventory')
          .set(auth(tokens.user))
          .send({
            variant_id: lifecycleVariant.id,
            stock: 10,
            reserved: 0
          })
      );
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
