const request = require('supertest');
const app = require('../app');

describe('Customers API', () => {
  test('GET /api/customers responde 200 con un arreglo de datos', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/customers/:id responde 200 para un id existente', async () => {
    const res = await request(app).get('/api/customers/c001');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('_id', 'c001');
  });

  test('GET /api/customers/:id responde 404 para un id inexistente', async () => {
    const res = await request(app).get('/api/customers/c9999');
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/customers crea un cliente nuevo', async () => {
    const res = await request(app)
      .post('/api/customers')
      .send({ email: 'nuevo.cliente@example.com', phone: '614-000-0000' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('email', 'nuevo.cliente@example.com');
  });

  test('POST /api/customers sin email responde 400', async () => {
    const res = await request(app).post('/api/customers').send({});
    expect(res.statusCode).toBe(400);
  });

  test('PUT /api/customers/:id actualiza un cliente existente', async () => {
    const res = await request(app)
      .put('/api/customers/c001')
      .send({ phone: '614-111-1111' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('phone', '614-111-1111');
  });

  test('PUT /api/customers/:id responde 404 para un id inexistente', async () => {
    const res = await request(app)
      .put('/api/customers/c9999')
      .send({ phone: '614-111-1111' });
    expect(res.statusCode).toBe(404);
  });

  test('DELETE /api/customers/:id elimina un cliente existente', async () => {
    const res = await request(app).delete('/api/customers/c002');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('_id', 'c002');
  });

  test('DELETE /api/customers/:id responde 404 para un id inexistente', async () => {
    const res = await request(app).delete('/api/customers/c9999');
    expect(res.statusCode).toBe(404);
  });
});