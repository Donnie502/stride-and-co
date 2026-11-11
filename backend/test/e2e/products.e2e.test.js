const { api, login, auth } = require('./helpers');
const en = require('../../locales/en.json');

describe('Products API E2E (/api/products)', () => {
  const suffix = Date.now();
  const tokens = {};
  const createdIds = new Set();

  let createdProduct = null;
  const productName = `Tenis E2E ${suffix}`;

  beforeAll(async () => {
    tokens.admin = await login('admin');
    tokens.seller = await login('seller');
    tokens.user = await login('user');
  });

  afterAll(async () => {
    const adminToken = await login('admin');
    for (const id of createdIds) {
      await api.delete(`/api/products/${id}`).set(auth(adminToken));
    }
  });

  describe('Ciclo completo con admin y lectura con seller/user', () => {
    test('POST /api/products crea un producto (201)', async () => {
      const res = await api
        .post('/api/products')
        .set(auth(tokens.admin))
        .send({
          name: productName,
          price: 899.5,
          brand: 'Stride E2E',
          description: `Descripción E2E ${suffix}`,
          active: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe(en.products.created);
      expect(res.body.data).toMatchObject({
        name: productName,
        brand: 'Stride E2E',
        description: `Descripción E2E ${suffix}`,
        active: true
      });
      expect(Number(res.body.data.price)).toBe(899.5);
      expect(res.body.data).toHaveProperty('id');

      createdProduct = res.body.data;
      createdIds.add(createdProduct.id);
    });

    test('GET /api/products/:id consulta el producto creado (200) e incluye variants', async () => {
      const res = await api
        .get(`/api/products/${createdProduct.id}`)
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        id: createdProduct.id,
        name: productName,
        brand: 'Stride E2E',
        description: `Descripción E2E ${suffix}`,
        active: true
      });
      expect(Number(res.body.data.price)).toBe(899.5);
      expect(Array.isArray(res.body.data.variants)).toBe(true);
    });

    test('GET /api/products lista productos (200) e incluye el creado', async () => {
      const res = await api
        .get('/api/products')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(en.products.list);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((p) => p.id === createdProduct.id);
      expect(found).toBeDefined();
      expect(found).toMatchObject({
        id: createdProduct.id,
        name: productName,
        brand: 'Stride E2E',
        description: `Descripción E2E ${suffix}`,
        active: true
      });
      expect(Number(found.price)).toBe(899.5);
    });

    test.each(['seller', 'user'])(
      '%s puede listar y consultar productos por id (200)',
      async (role) => {
        const token = tokens[role];

        const listRes = await api
          .get('/api/products')
          .set(auth(token));
        expect(listRes.statusCode).toBe(200);
        expect(Array.isArray(listRes.body.data)).toBe(true);

        const findRes = await api
          .get(`/api/products/${createdProduct.id}`)
          .set(auth(token));
        expect(findRes.statusCode).toBe(200);
        expect(findRes.body.data.id).toBe(createdProduct.id);
        expect(Array.isArray(findRes.body.data.variants)).toBe(true);
      }
    );

    test('PUT /api/products/:id actualiza el producto (200) y se confirma con GET', async () => {
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
      expect(putRes.body.data).toMatchObject({
        id: createdProduct.id,
        name: updatedName,
        brand: 'Stride Pro',
        description: `Descripción actualizada ${suffix}`,
        active: false
      });
      expect(Number(putRes.body.data.price)).toBe(updatedPrice);

      const getRes = await api
        .get(`/api/products/${createdProduct.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject({
        id: createdProduct.id,
        name: updatedName,
        brand: 'Stride Pro',
        description: `Descripción actualizada ${suffix}`,
        active: false
      });
      expect(Number(getRes.body.data.price)).toBe(updatedPrice);
      expect(Array.isArray(getRes.body.data.variants)).toBe(true);
    });

    test('DELETE /api/products/:id elimina el producto (200) y un GET posterior responde 404', async () => {
      const delRes = await api
        .delete(`/api/products/${createdProduct.id}`)
        .set(auth(tokens.admin));

      expect(delRes.statusCode).toBe(200);
      createdIds.delete(createdProduct.id);

      const getRes = await api
        .get(`/api/products/${createdProduct.id}`)
        .set(auth(tokens.admin));

      expect(getRes.statusCode).toBe(404);
      expect(getRes.body).toEqual({ message: en.products.notFound });
    });
  });

  describe('Validaciones y casos de error (400 / 404)', () => {
    test('POST /api/products con price negativo responde 400', async () => {
      const res = await api
        .post('/api/products')
        .set(auth(tokens.admin))
        .send({
          name: `Precio Negativo ${suffix}`,
          price: -10,
          brand: 'Stride E2E',
          description: 'Inválido',
          active: true
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.products.priceRequired });
    });

    test('POST /api/products con price como texto responde 400', async () => {
      const res = await api
        .post('/api/products')
        .set(auth(tokens.admin))
        .send({
          name: `Precio Texto ${suffix}`,
          price: '899.50',
          brand: 'Stride E2E',
          description: 'Inválido',
          active: true
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.products.priceRequired });
    });

    test('POST /api/products sin name responde 400', async () => {
      const res = await api
        .post('/api/products')
        .set(auth(tokens.admin))
        .send({
          price: 500,
          brand: 'Stride E2E'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.products.nameRequired });
    });

    test('GET /api/products/:id con id mal formado responde 400', async () => {
      const res = await api
        .get('/api/products/id-invalido')
        .set(auth(tokens.admin));

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: en.common.invalidId });
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

        const createRes = await api
          .post('/api/products')
          .set(auth(token))
          .send({
            name: `Denegado ${role} ${suffix}`,
            price: 300,
            brand: 'Stride E2E',
            description: 'No permitido',
            active: true
          });
        expect(createRes.statusCode).toBe(403);
        expect(createRes.body).toEqual({ message: en.auth.forbidden });

        const updateRes = await api
          .put('/api/products/1')
          .set(auth(token))
          .send({ price: 400 });
        expect(updateRes.statusCode).toBe(403);
        expect(updateRes.body).toEqual({ message: en.auth.forbidden });

        const deleteRes = await api
          .delete('/api/products/1')
          .set(auth(token));
        expect(deleteRes.statusCode).toBe(403);
        expect(deleteRes.body).toEqual({ message: en.auth.forbidden });
      }
    );
  });
});
