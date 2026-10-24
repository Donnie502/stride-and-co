const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const { sequelize, Product } = require('../models/relationals');
const { Customer, Order } = require('../models/documents');
const connectMongo = require('../config/mongoose');
const { revisarBdDePrueba, prepararBd, crearUsuario, login } = require('./helpers/db');

// crea un cliente y una orden que le pertenece al usuario
async function crearOrden(user) {
  const customer = await Customer.create({ userId: user.id, email: user.email });
  return Order.create({ customerId: customer._id, totals: { subtotal: 100, total: 100 } });
}

describe('RBAC en los endpoints', () => {
  const tokens = {};
  let producto;
  let ordenPropia;
  let ordenAjena;

  beforeAll(async () => {
    await prepararBd();

    await connectMongo();
    revisarBdDePrueba(mongoose.connection.name);
    await mongoose.connection.dropDatabase();

    const admin = await crearUsuario('admin', 'admin@prueba.com');
    const seller = await crearUsuario('seller', 'seller@prueba.com');
    const user = await crearUsuario('user', 'user@prueba.com');
    const otro = await crearUsuario('user', 'otro@prueba.com');

    tokens.admin = await login(admin.email);
    tokens.seller = await login(seller.email);
    tokens.user = await login(user.email);

    producto = await Product.create({ name: 'Tenis Prueba', brand: 'Stride', price: 999.99 });
    ordenPropia = await crearOrden(user);
    ordenAjena = await crearOrden(otro);
  }, 30000);

  afterAll(async () => {
    await sequelize.close();
    await mongoose.disconnect();
  });

  test('admin con products:delete:any puede borrar cualquier producto', async () => {
    const res = await request(app)
      .delete(`/api/products/${producto.id}`)
      .set('Authorization', `Bearer ${tokens.admin}`);

    expect(res.statusCode).toBe(200);
  });

  test('seller sin products:delete:any recibe 403 al borrar un producto', async () => {
    const res = await request(app)
      .delete(`/api/products/${producto.id}`)
      .set('Authorization', `Bearer ${tokens.seller}`);

    expect(res.statusCode).toBe(403);
  });

  test('user con orders:read:own puede ver su propia orden', async () => {
    const res = await request(app)
      .get(`/api/orders/${ordenPropia._id}`)
      .set('Authorization', `Bearer ${tokens.user}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data._id).toBe(String(ordenPropia._id));
  });

  test('user con orders:read:own recibe 403 con la orden de otro usuario', async () => {
    const res = await request(app)
      .get(`/api/orders/${ordenAjena._id}`)
      .set('Authorization', `Bearer ${tokens.user}`);

    expect(res.statusCode).toBe(403);
  });

  test('user sin orders:read:any recibe 403 al listar todas las ordenes', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${tokens.user}`);

    expect(res.statusCode).toBe(403);
  });
});
