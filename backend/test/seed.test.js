jest.mock('../models/sql', () => ({
  sequelize: {},
  Role: { findOne: jest.fn() },
  User: { findOne: jest.fn(), create: jest.fn() },
  Product: { findOrCreate: jest.fn() },
  ProductVariant: { findOrCreate: jest.fn() },
  Inventory: { findOrCreate: jest.fn() }
}));

const { Role, User, Product, ProductVariant, Inventory } = require('../models/sql');
const { Customer, Order } = require('../models/mongo');
const { verifyPassword } = require('../utils/password');
const { seedDemoData, errorCodes } = require('../seeders');

afterEach(() => jest.restoreAllMocks());

test('obtiene códigos de errores de conexión anidados aunque no tengan mensaje', () => {
  const original = new AggregateError([
    Object.assign(new Error(), { code: 'ECONNREFUSED' }),
    Object.assign(new Error(), { code: 'ECONNREFUSED' })
  ]);
  const error = { message: '', original, parent: original };
  error.cause = error;
  expect(errorCodes(error)).toEqual(['ECONNREFUSED']);
  expect(errorCodes(new Error('otro error'))).toEqual([]);
});

test('el seed completo de datos valida los modelos y no duplica ni repone datos al repetirlo', async () => {
  const roles = ['admin', 'seller', 'user'].map((name, index) => ({ name, id: index + 1 }));
  const users = [];
  const products = [];
  const variants = [];
  const inventory = [];
  const customers = [];
  const orders = [];
  Role.findOne.mockImplementation(async ({ where }) => roles.find(role => role.name === where.name));
  User.findOne.mockImplementation(async ({ where }) => users.find(user => user.email === where.email));
  User.create.mockImplementation(async values => {
    const user = { id: users.length + 1, ...values };
    users.push(user);
    return user;
  });
  for (const [model, records] of [[Product, products], [ProductVariant, variants], [Inventory, inventory]]) {
    model.findOrCreate.mockImplementation(async ({ where, defaults }) => {
      const existing = records.find(record => Object.entries(where).every(([key, value]) => record[key] === value));
      if (existing) return [existing, false];
      const record = { id: records.length + 1, ...defaults, ...where };
      records.push(record);
      return [record, true];
    });
  }
  jest.spyOn(Customer, 'findOne').mockImplementation(async ({ userId }) => customers.find(customer => customer.userId === userId));
  jest.spyOn(Customer, 'create').mockImplementation(async values => {
    const customer = new Customer(values);
    await customer.validate();
    customers.push(customer);
    return customer;
  });
  jest.spyOn(Order, 'findById').mockImplementation(async id => orders.find(order => String(order._id) === String(id)));
  jest.spyOn(Order, 'create').mockImplementation(async values => {
    const order = new Order(values);
    await order.validate();
    orders.push(order);
    return order;
  });

  await seedDemoData();
  expect(users).toHaveLength(3);
  expect(products).toHaveLength(2);
  expect(variants).toHaveLength(2);
  expect(inventory).toHaveLength(2);
  expect(customers).toHaveLength(3);
  expect(orders).toHaveLength(3);
  expect(await verifyPassword('DemoAdmin2026!', users[0].password_hash)).toBe(true);
  expect(users.every(user => user.active && user.salt_key && user.password_hash)).toBe(true);
  for (const order of orders) {
    expect(customers.some(customer => String(customer._id) === String(order.customerId))).toBe(true);
    expect(order.salesPersonId).toBe(users[1].id);
    expect(products.some(product => product.id === order.items[0].productId)).toBe(true);
    expect(order.totals.total.toString()).toBe(String(products.find(product => product.id === order.items[0].productId).price));
    expect(order.paymentMethod).toBe('CASH');
    expect(order.statusHistory[0].status).toBe('PENDING');
  }
  inventory[0].stock = 7;
  orders[0].statusHistory.push({ status: 'PAID', changedById: users[1].id });
  const hash = users[0].password_hash;

  await seedDemoData();
  expect([users.length, products.length, variants.length, inventory.length, customers.length, orders.length]).toEqual([3, 2, 2, 2, 3, 3]);
  expect(users[0].password_hash).toBe(hash);
  expect(inventory[0].stock).toBe(7);
  expect(orders[0].statusHistory).toHaveLength(2);

  users[0].active = false;
  await expect(seedDemoData()).rejects.toThrow('inactiva');
});
