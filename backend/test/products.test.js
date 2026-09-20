const request = require('supertest');
const app = require('../app');

describe('Products API', () => {
  test('GET /api/products responde 200 con un arreglo de datos', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/products/:id responde 200 para un id existente', async () => {
    const res = await request(app).get('/api/products/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('id', 1);
  });

  test('GET /api/products/:id responde 404 para un id inexistente', async () => {
    const res = await request(app).get('/api/products/9999');
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/products crea un producto nuevo', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Sandalia Urban', brand: 'Stride', price: 49.99 });
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('name', 'Sandalia Urban');
  });

  test('POST /api/products sin price responde 400', async () => {
    const res = await request(app).post('/api/products').send({ name: 'Sin precio' });
    expect(res.statusCode).toBe(400);
  });
});