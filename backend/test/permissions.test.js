const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../models/relationals');
const { prepararBd, crearUsuario, login } = require('./helpers/db');

describe('Permissions API', () => {
  let token;

  // las rutas de permisos ahora piden token, se usa uno de admin
  // el seed ya deja el permiso con id 1
  beforeAll(async () => {
    await prepararBd();
    const admin = await crearUsuario('admin', 'admin@prueba.com');
    token = await login(admin.email);
  }, 30000);

  afterAll(async () => {
    await sequelize.close();
  });

  test('GET /api/permissions responde 200 con un arreglo de datos', async () => {
    const res = await request(app).get('/api/permissions').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/permissions/:id responde 200 para un id existente', async () => {
    const res = await request(app).get('/api/permissions/1').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('id', 1);
  });

  test('GET /api/permissions/:id responde 404 para un id inexistente', async () => {
    const res = await request(app).get('/api/permissions/9999').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/permissions crea un permiso nuevo', async () => {
    const res = await request(app)
      .post('/api/permissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'orders.manage', description: 'Administrar ordenes' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('key', 'orders.manage');
  });

  test('POST /api/permissions sin key responde 400', async () => {
    const res = await request(app).post('/api/permissions').set('Authorization', `Bearer ${token}`).send({});
    expect(res.statusCode).toBe(400);
  });
});