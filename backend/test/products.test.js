const request = require('supertest');
const app = require('../app');
const { sequelize, Product } = require('../models/relationals');
const { prepararBd, crearUsuario, login } = require('./helpers/db');

describe('Products API', () => {
  let token;

  // las rutas de productos ahora piden token, se usa uno de admin
  beforeAll(async () => {
    await prepararBd();
    const admin = await crearUsuario('admin', 'admin@prueba.com');
    token = await login(admin.email);

    // producto con id 1 para la prueba de id existente
    await Product.create({ name: 'Tenis Run', brand: 'Stride', price: 99.99 });
  }, 30000);

  afterAll(async () => {
    await sequelize.close();
  });

  test('GET /api/products responde 200 con un arreglo de datos', async () => {
    const res = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/products/:id responde 200 para un id existente', async () => {
    const res = await request(app).get('/api/products/1').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('id', 1);
  });

  test('GET /api/products/:id responde 404 para un id inexistente', async () => {
    const res = await request(app).get('/api/products/9999').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/products crea un producto nuevo', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sandalia Urban', brand: 'Stride', price: 49.99 });
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('name', 'Sandalia Urban');
  });

  test('POST /api/products sin price responde 400', async () => {
    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({ name: 'Sin precio' });
    expect(res.statusCode).toBe(400);
  });
});