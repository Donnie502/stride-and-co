const mongoose = require('mongoose');
const Order = require('../models/mongo/order');

function validOrder() {
  return {
    customerId: new mongoose.Types.ObjectId(),
    items: [{ productId: 1, quantity: 2, unitPrice: 50 }],
    totals: { subtotal: 100, total: 100 }
  };
}

test('conserva importes Decimal128 sin perder precisión y los serializa como decimal', async () => {
  const amount = '12345678901234567890.12345678901234';
  const order = new Order({ ...validOrder(), totals: { subtotal: amount, total: amount } });
  await order.validate();
  expect(order.totals.total).toBeInstanceOf(mongoose.Types.Decimal128);
  expect(order.totals.total.toString()).toBe(amount);
  expect(order.items[0].unitPrice).toBeInstanceOf(mongoose.Types.Decimal128);
  expect(order.totals.shipping.toString()).toBe('0');
  expect(order.totals.discount.toString()).toBe('0');
  expect(JSON.parse(JSON.stringify(order)).totals.total).toEqual({ $numberDecimal: amount });
});

test.each(['-0.01', '-1E-6000', 'NaN', 'Infinity', '-Infinity', 'invalid'])(
  'rechaza importes negativos o no finitos: %s', async (amount) => {
    const order = new Order({ ...validOrder(), totals: { ...validOrder().totals, total: amount } });
    await expect(order.validate()).rejects.toHaveProperty('name', 'ValidationError');
  }
);

test('conserva artículos, dirección e historial y referencia al cliente', async () => {
  const order = new Order({
    ...validOrder(),
    shippingAddress: { postalCode: '31000' },
    statusHistory: [{ status: 'PENDING', changedById: 1 }]
  });
  await order.validate();
  expect(order.items[0].quantity).toBe(2);
  expect(order.shippingAddress.postalCode).toBe('31000');
  expect(order.statusHistory[0].changedAt).toBeInstanceOf(Date);
  expect(Order.schema.path('customerId').options.ref).toBe('Customer');
});

test.each([undefined, null, []])('rechaza artículos ausentes o vacíos: %p', async (items) => {
  await expect(new Order({ ...validOrder(), items }).validate()).rejects.toHaveProperty('name', 'ValidationError');
});

test.each([
  { productId: 0, quantity: 1, unitPrice: 50 },
  { productId: 1, quantity: 1.5, unitPrice: 50 },
  { productId: 1, quantity: 0, unitPrice: 50 },
  { productId: 1, quantity: 1, unitPrice: -1 }
])('rechaza artículos inválidos: %p', async (item) => {
  await expect(new Order({ ...validOrder(), items: [item] }).validate()).rejects.toHaveProperty('name', 'ValidationError');
});

test.each(['CARD', 'CASH', 'TRANSFER'])('acepta el método de pago %s', async (paymentMethod) => {
  await expect(new Order({ ...validOrder(), paymentMethod }).validate()).resolves.toBeUndefined();
});

test.each(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])('acepta el estado %s', async (status) => {
  const order = new Order({ ...validOrder(), statusHistory: [{ status, changedById: 1 }] });
  await expect(order.validate()).resolves.toBeUndefined();
});

test.each(['cash', 'CRYPTO', ''])('rechaza el método de pago %p', async (paymentMethod) => {
  await expect(new Order({ ...validOrder(), paymentMethod }).validate()).rejects.toHaveProperty('errors.paymentMethod');
});

test.each(['created', 'pending', 'UNKNOWN', ''])('rechaza el estado %p', async (status) => {
  const order = new Order({ ...validOrder(), statusHistory: [{ status, changedById: 1 }] });
  await expect(order.validate()).rejects.toHaveProperty(['errors', 'statusHistory.0.status']);
});

