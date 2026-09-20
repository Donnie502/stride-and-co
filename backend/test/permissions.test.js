const request = require('supertest');
const app = require('../app');

describe('Permissions API', () => {
  test('GET /api/permissions responde 200 con un arreglo de datos', async () => {
    const res = await request(app).get('/api/permissions');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/permissions/:id responde 200 para un id existente', async () => {
    const res = await request(app).get('/api/permissions/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('id', 1);
  });

  test('GET /api/permissions/:id responde 404 para un id inexistente', async () => {
    const res = await request(app).get('/api/permissions/9999');
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/permissions crea un permiso nuevo', async () => {
    const res = await request(app)
      .post('/api/permissions')
      .send({ key: 'orders.manage', description: 'Administrar ordenes' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('key', 'orders.manage');
  });

  test('POST /api/permissions sin key responde 400', async () => {
    const res = await request(app).post('/api/permissions').send({});
    expect(res.statusCode).toBe(400);
  });
});