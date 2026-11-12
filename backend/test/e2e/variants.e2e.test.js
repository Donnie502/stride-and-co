const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

describe('Variants API E2E (/api/variants)', () => {
  const suffix = Date.now();
  const tokens = {};
  const createdVariantIds = new Set();

  let testProduct = null;

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
        name: `Producto Variantes E2E ${suffix}`,
        price: 950,
        brand: 'Stride E2E',
        description: `Producto temporal para pruebas de variantes ${suffix}`,
        active: true
      });

    testProduct = prodRes.body?.data || null;
    expect(prodRes.statusCode).toBe(201);
  });

  afterAll(async () => {
    const adminToken = await login('admin');

    for (const id of createdVariantIds) {
      await api.delete(`/api/variants/${id}`).set(auth(adminToken));
    }

    if (testProduct && testProduct.id) {
      await api.delete(`/api/products/${testProduct.id}`).set(auth(adminToken));
    }
  });

  describe('Ciclo completo con admin', () => {
    test('crear (201), consultar por id (200), listar (200), actualizar (200) y confirmar con GET, eliminar (200) y GET da 404', async () => {
      const variantSku = `SKU-E2E-${suffix}`;

      // 1. Crear (201)
      const createRes = trackVariant(
        await api
          .post('/api/variants')
          .set(auth(tokens.admin))
          .send({
            product_id: testProduct.id,
            sku: variantSku,
            size: '27 MX',
            color: 'Negro',
            active: true
          })
      );

      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.message).toBe(en.variants.created);
      expect(createRes.body.data).toMatchObject({
        product_id: testProduct.id,
        sku: variantSku,
        size: '27 MX',
        color: 'Negro',
        active: true
      });
      expect(createRes.body.data).toHaveProperty('id');

      const createdVariant = createRes.body.data;

      // 2. Consultar por id (200)
      const findRes = await api
        .get(`/api/variants/${createdVariant.id}`)
        .set(auth(tokens.admin));

      expect(findRes.statusCode).toBe(200);
      expect(findRes.body.message).toBe(en.variants.found);
      expect(findRes.body.data).toMatchObject({
        id: createdVariant.id,
        product_id: testProduct.id,
        sku: variantSku,
        size: '27 MX',
        color: 'Negro',
        active: true
      });

      // 3. Listar (200 e incluir la creada)
      const listRes = await api
        .get('/api/variants')
        .set(auth(tokens.admin));

      expect(listRes.statusCode).toBe(200);
      expect(listRes.body.message).toBe(en.variants.list);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      const found = listRes.body.data.find((v) => v.id === createdVariant.id);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        id: createdVariant.id,
        product_id: testProduct.id,
        sku: variantSku,
        size: '27 MX',
        color: 'Negro',
        active: true
      });

      // 4. Actualizar (200) y confirmar con GET
      const updatedSku = `SKU-UPD-${suffix}`;

      const putRes = await api
        .put(`/api/variants/${createdVariant.id}`)
        .set(auth(tokens.admin))
        .send({
          sku: updatedSku,
          size: '28 MX',
          color: 'Blanco',
          active: false
        });

      expect(putRes.statusCode).toBe(200);
      expect(putRes.body.message).toBe(en.variants.updated);
      expect(putRes.body.data).toMatchObject({
        id: createdVariant.id,
        product_id: testProduct.id,
        sku: updatedSku,
        size: '28 MX',
        color: 'Blanco',
        active: false
      });

      const confirmGetRes = await api
        .get(`/api/variants/${createdVariant.id}`)
        .set(auth(tokens.admin));

      expect(confirmGetRes.statusCode).toBe(200);
      expect(confirmGetRes.body.data).toMatchObject({
        id: createdVariant.id,
        product_id: testProduct.id,
        sku: updatedSku,
        size: '28 MX',
        color: 'Blanco',
        active: false
      });

      // 5. Eliminar (200) y GET da 404
      const delRes = await api
        .delete(`/api/variants/${createdVariant.id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.message).toBe(en.variants.deleted);
      createdVariantIds.delete(createdVariant.id);

      const afterDelRes = await api
        .get(`/api/variants/${createdVariant.id}`)
        .set(auth(tokens.admin));

      expect(afterDelRes.statusCode).toBe(404);
      expect(afterDelRes.body).toEqual({ message: en.variants.notFound });
    });
  });

  describe('Validaciones y casos de error (400 / 404)', () => {
    test('POST /api/variants con sku repetido responde 400', async () => {
      const dupSku = `SKU-DUP-${Date.now()}`;

      const firstRes = trackVariant(
        await api
          .post('/api/variants')
          .set(auth(tokens.admin))
          .send({
            product_id: testProduct.id,
            sku: dupSku,
            size: '26 MX',
            color: 'Azul',
            active: true
          })
      );

      expect(firstRes.statusCode).toBe(201);

      const secondRes = trackVariant(
        await api
          .post('/api/variants')
          .set(auth(tokens.admin))
          .send({
            product_id: testProduct.id,
            sku: dupSku,
            size: '27 MX',
            color: 'Rojo',
            active: true
          })
      );

      expect(secondRes.statusCode).toBe(400);
      expect(secondRes.body).toEqual({ message: en.common.duplicate });
    });

    test('POST /api/variants con datos inválidos responde 400', async () => {
      const missingProductIdRes = trackVariant(
        await api
          .post('/api/variants')
          .set(auth(tokens.admin))
          .send({
            sku: `SKU-NOPROD-${suffix}`,
            size: '26 MX',
            color: 'Gris'
          })
      );

      expect(missingProductIdRes.statusCode).toBe(400);
      expect(missingProductIdRes.body).toEqual({ message: en.variants.productIdRequired });

      const missingSkuRes = trackVariant(
        await api
          .post('/api/variants')
          .set(auth(tokens.admin))
          .send({
            product_id: testProduct.id,
            size: '26 MX',
            color: 'Gris'
          })
      );

      expect(missingSkuRes.statusCode).toBe(400);
      expect(missingSkuRes.body).toEqual({ message: en.variants.skuRequired });
    });

    test('GET, PUT y DELETE /api/variants/:id con id mal formado responden 400', async () => {
      const getRes = await api
        .get('/api/variants/id-invalido')
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(400);
      expect(getRes.body).toEqual({ message: en.common.invalidId });

      const putRes = await api
        .put('/api/variants/id-invalido')
        .set(auth(tokens.admin))
        .send({ size: '28 MX' });
      expect(putRes.statusCode).toBe(400);
      expect(putRes.body).toEqual({ message: en.common.invalidId });

      const delRes = await api
        .delete('/api/variants/id-invalido')
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(400);
      expect(delRes.body).toEqual({ message: en.common.invalidId });
    });

    test('GET, PUT y DELETE /api/variants/:id con id inexistente responden 404', async () => {
      const nonExistentId = 999999;

      const getRes = await api
        .get(`/api/variants/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.variants.notFound });

      const putRes = await api
        .put(`/api/variants/${nonExistentId}`)
        .set(auth(tokens.admin))
        .send({ size: '29 MX' });
      expect(putRes.statusCode).toBe(404);
      expect(putRes.body).toEqual({ message: en.variants.notFound });

      const delRes = await api
        .delete(`/api/variants/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(404);
      expect(delRes.body).toEqual({ message: en.variants.notFound });
    });
  });

  describe('Control de acceso: escritura de seller y user responde 403', () => {
    test.each(['seller', 'user'])(
      '%s recibe 403 en POST, PUT y DELETE /api/variants',
      async (role) => {
        const token = tokens[role];

        const createRes = trackVariant(
          await api
            .post('/api/variants')
            .set(auth(token))
            .send({
              product_id: testProduct.id,
              sku: `SKU-DENIED-${role}-${Date.now()}`,
              size: '26 MX',
              color: 'Verde',
              active: true
            })
        );
        expect(createRes.statusCode).toBe(403);
        expect(createRes.body).toEqual({ message: en.auth.forbidden });

        const updateRes = await api
          .put('/api/variants/1')
          .set(auth(token))
          .send({ color: 'Amarillo' });
        expect(updateRes.statusCode).toBe(403);
        expect(updateRes.body).toEqual({ message: en.auth.forbidden });

        const deleteRes = await api
          .delete('/api/variants/1')
          .set(auth(token));
        expect(deleteRes.statusCode).toBe(403);
        expect(deleteRes.body).toEqual({ message: en.auth.forbidden });
      }
    );
  });
});
