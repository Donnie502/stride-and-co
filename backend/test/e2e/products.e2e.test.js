const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

describe('Products API E2E (/api/products)', () => {
  const suffix = Date.now();
  const tokens = {};
  const createdIds = new Set();

  let sharedProduct = null;

  function trackProduct(res) {
    if (res.body?.data?.id) {
      createdIds.add(res.body.data.id);
    }
    return res;
  }

  beforeAll(async () => {
    tokens.admin = await login('admin');
    tokens.seller = await login('seller');
    tokens.user = await login('user');

    // Producto dedicado para pruebas de lectura de seller/user sin depender del orden
    const sharedRes = trackProduct(
      await api
        .post('/api/products')
        .set(auth(tokens.admin))
        .send({
          name: `Tenis Lectura ${suffix}`,
          price: 650,
          brand: 'Stride E2E',
          description: `Producto compartido E2E ${suffix}`,
          active: true
        })
    );
    expect(sharedRes.statusCode).toBe(201);
    sharedProduct = sharedRes.body.data;
  });

  afterAll(async () => {
    const adminToken = await login('admin');
    for (const id of createdIds) {
      await api.delete(`/api/products/${id}`).set(auth(adminToken));
    }
  });

  describe('Ciclo completo con admin y lectura con seller/user', () => {
    test('crear (201), consultar por id con variants (200), listar (200), actualizar (200) y confirmar con GET, eliminar (200) y GET da 404', async () => {
      const productName = `Tenis E2E ${suffix}`;

      // 1. Crear (201)
      const createRes = trackProduct(
        await api
          .post('/api/products')
          .set(auth(tokens.admin))
          .send({
            name: productName,
            price: 899.5,
            brand: 'Stride E2E',
            description: `Descripción E2E ${suffix}`,
            active: true
          })
      );

      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.message).toBe(en.products.created);
      expect(createRes.body.data).toMatchObject({
        name: productName,
        brand: 'Stride E2E',
        description: `Descripción E2E ${suffix}`,
        active: true
      });
      expect(Number(createRes.body.data.price)).toBe(899.5);
      expect(createRes.body.data).toHaveProperty('id');

      const createdProduct = createRes.body.data;

      // 2. Consultar por id (200) incluyendo variants
      const findRes = await api
        .get(`/api/products/${createdProduct.id}`)
        .set(auth(tokens.admin));

      expect(findRes.statusCode).toBe(200);
      expect(findRes.body.message).toBe(
        en.products.found.replace('{{{id}}}', String(createdProduct.id))
      );
      expect(findRes.body.data).toMatchObject({
        id: createdProduct.id,
        name: productName,
        brand: 'Stride E2E',
        description: `Descripción E2E ${suffix}`,
        active: true
      });
      expect(Number(findRes.body.data.price)).toBe(899.5);
      expect(Array.isArray(findRes.body.data.variants)).toBe(true);

      // 3. Listar (200 e incluir el creado)
      const listRes = await api
        .get('/api/products')
        .set(auth(tokens.admin));

      expect(listRes.statusCode).toBe(200);
      expect(listRes.body.message).toBe(en.products.list);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      const found = listRes.body.data.find((p) => p.id === createdProduct.id);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        id: createdProduct.id,
        name: productName,
        brand: 'Stride E2E',
        description: `Descripción E2E ${suffix}`,
        active: true
      });
      expect(Number(found.price)).toBe(899.5);

      // 4. Actualizar (200) y confirmar con GET
      const updatedName = `Tenis Actualizado ${suffix}`;
      const updatedPrice = 1150.75;

      const putRes = await api
        .put(`/api/products/${createdProduct.id}`)
        .set(auth(tokens.admin))
        .send({
          name: updatedName,
          price: updatedPrice,
          brand: 'Stride Pro',
          description: `Descripción actualizada ${suffix}`,
          active: false
        });

      expect(putRes.statusCode).toBe(200);
      expect(putRes.body.message).toBe(
        en.products.updated.replace('{{{id}}}', String(createdProduct.id))
      );
      expect(putRes.body.data).toMatchObject({
        id: createdProduct.id,
        name: updatedName,
        brand: 'Stride Pro',
        description: `Descripción actualizada ${suffix}`,
        active: false
      });
      expect(Number(putRes.body.data.price)).toBe(updatedPrice);

      const confirmGetRes = await api
        .get(`/api/products/${createdProduct.id}`)
        .set(auth(tokens.admin));

      expect(confirmGetRes.statusCode).toBe(200);
      expect(confirmGetRes.body.data).toMatchObject({
        id: createdProduct.id,
        name: updatedName,
        brand: 'Stride Pro',
        description: `Descripción actualizada ${suffix}`,
        active: false
      });
      expect(Number(confirmGetRes.body.data.price)).toBe(updatedPrice);
      expect(Array.isArray(confirmGetRes.body.data.variants)).toBe(true);

      // 5. Eliminar (200) y GET da 404
      const delRes = await api
        .delete(`/api/products/${createdProduct.id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.message).toBe(
        en.products.deleted.replace('{{{id}}}', String(createdProduct.id))
      );
      createdIds.delete(createdProduct.id);

      const afterDelRes = await api
        .get(`/api/products/${createdProduct.id}`)
        .set(auth(tokens.admin));

      expect(afterDelRes.statusCode).toBe(404);
      expect(afterDelRes.body).toEqual({ message: en.products.notFound });
    });

    test.each(['seller', 'user'])(
      '%s puede listar y consultar productos por id incluyendo variants (200)',
      async (role) => {
        const token = tokens[role];

        const listRes = await api
          .get('/api/products')
          .set(auth(token));
        expect(listRes.statusCode).toBe(200);
        expect(listRes.body.message).toBe(en.products.list);
        expect(Array.isArray(listRes.body.data)).toBe(true);

        const findRes = await api
          .get(`/api/products/${sharedProduct.id}`)
          .set(auth(token));
        expect(findRes.statusCode).toBe(200);
        expect(findRes.body.data.id).toBe(sharedProduct.id);
        expect(Array.isArray(findRes.body.data.variants)).toBe(true);
      }
    );
  });

  describe('Validaciones y casos de error (400 / 404)', () => {
    test('POST /api/products con price negativo responde 400', async () => {
      const res = trackProduct(
        await api
          .post('/api/products')
          .set(auth(tokens.admin))
          .send({
            name: `Precio Negativo ${suffix}`,
            price: -10,
            brand: 'Stride E2E',
            description: 'Inválido',
            active: true
          })
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.products.priceRequired });
    });

    test('POST /api/products con price como texto responde 400', async () => {
      const res = trackProduct(
        await api
          .post('/api/products')
          .set(auth(tokens.admin))
          .send({
            name: `Precio Texto ${suffix}`,
            price: '899.50',
            brand: 'Stride E2E',
            description: 'Inválido',
            active: true
          })
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.products.priceRequired });
    });

    test('POST /api/products sin name responde 400', async () => {
      const res = trackProduct(
        await api
          .post('/api/products')
          .set(auth(tokens.admin))
          .send({
            price: 500,
            brand: 'Stride E2E'
          })
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.products.nameRequired });
    });

    test('GET, PUT y DELETE /api/products/:id con id mal formado responden 400', async () => {
      const getRes = await api
        .get('/api/products/id-invalido')
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(400);
      expect(getRes.body).toEqual({ message: en.common.invalidId });

      const putRes = await api
        .put('/api/products/id-invalido')
        .set(auth(tokens.admin))
        .send({ price: 100 });
      expect(putRes.statusCode).toBe(400);
      expect(putRes.body).toEqual({ message: en.common.invalidId });

      const delRes = await api
        .delete('/api/products/id-invalido')
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(400);
      expect(delRes.body).toEqual({ message: en.common.invalidId });
    });

    test('GET, PUT y DELETE /api/products/:id con id inexistente responden 404', async () => {
      const nonExistentId = 999999;

      const getRes = await api
        .get(`/api/products/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.products.notFound });

      const putRes = await api
        .put(`/api/products/${nonExistentId}`)
        .set(auth(tokens.admin))
        .send({ name: `No existe ${suffix}`, price: 100 });
      expect(putRes.statusCode).toBe(404);
      expect(putRes.body).toEqual({ message: en.products.notFound });

      const delRes = await api
        .delete(`/api/products/${nonExistentId}`)
        .set(auth(tokens.admin));
      expect(delRes.statusCode).toBe(404);
      expect(delRes.body).toEqual({ message: en.products.notFound });
    });
  });

  describe('Control de acceso: escritura como seller y user responde 403', () => {
    test.each(['seller', 'user'])(
      '%s recibe 403 en POST, PUT y DELETE /api/products',
      async (role) => {
        const token = tokens[role];

        const createRes = trackProduct(
          await api
            .post('/api/products')
            .set(auth(token))
            .send({
              name: `Denegado ${role} ${suffix}`,
              price: 300,
              brand: 'Stride E2E',
              description: 'No permitido',
              active: true
            })
        );
        expect(createRes.statusCode).toBe(403);
        expect(createRes.body).toEqual({ message: en.auth.forbidden });

        const updateRes = await api
          .put(`/api/products/${sharedProduct.id}`)
          .set(auth(token))
          .send({ price: 400 });
        expect(updateRes.statusCode).toBe(403);
        expect(updateRes.body).toEqual({ message: en.auth.forbidden });

        const deleteRes = await api
          .delete(`/api/products/${sharedProduct.id}`)
          .set(auth(token));
        expect(deleteRes.statusCode).toBe(403);
        expect(deleteRes.body).toEqual({ message: en.auth.forbidden });
      }
    );
  });
});
