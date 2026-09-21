const request = require('supertest');
const app = require('../app');

describe('Orders API', () => {
  test('GET /api/orders responde 200 con un arreglo de datos', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/orders/:id responde 200 para un id existente', async () => {
    const res = await request(app).get('/api/orders/o001');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('_id', 'o001');
  });

  test('GET /api/orders/:id responde 404 para un id inexistente', async () => {
    const res = await request(app).get('/api/orders/o9999');
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/orders crea una orden nueva', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customerId: 'c001',
        items: [{ productId: 20, quantity: 1, unitPrice: 500 }],
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('customerId', 'c001');
    expect(res.body.data.statusHistory[0]).toHaveProperty('status', 'pending');
  });

  test('POST /api/orders sin items responde 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ customerId: 'c001' });
    expect(res.statusCode).toBe(400);
  });

  test('PUT /api/orders/:id actualiza una orden existente', async () => {
    const res = await request(app)
      .put('/api/orders/o001')
      .send({ paymentMethod: 'cash' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('paymentMethod', 'cash');
  });

  test('PUT /api/orders/:id responde 404 para un id inexistente', async () => {
    const res = await request(app)
      .put('/api/orders/o9999')
      .send({ paymentMethod: 'cash' });
    expect(res.statusCode).toBe(404);
  });

  test('PATCH /api/orders/:id/status agrega una entrada al historial', async () => {
    const res = await request(app)
      .patch('/api/orders/o001/status')
      .send({ status: 'shipped', note: 'Enviado al cliente' });
    expect(res.statusCode).toBe(200);
    const history = res.body.data.statusHistory;
    expect(history[history.length - 1]).toHaveProperty('status', 'shipped');
  });

  test('PATCH /api/orders/:id/status sin status responde 400', async () => {
    const res = await request(app)
      .patch('/api/orders/o001/status')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  test('DELETE /api/orders/:id elimina una orden existente', async () => {
    const res = await request(app).delete('/api/orders/o001');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('_id', 'o001');
  });

  test('DELETE /api/orders/:id responde 404 para un id inexistente', async () => {
    const res = await request(app).delete('/api/orders/o9999');
    expect(res.statusCode).toBe(404);
  });
});