const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { Customer, Order } = require('../models/mongo');
const {
  USERS, OTHER_USER_ID, loadPermissions, mockUsers, bearer, query, failingQuery, newId, msg
} = require('./helpers/apiMocks');

// un cliente del usuario owner y otro de un usuario distinto
const OWN_CUSTOMER = newId();
const OTHER_CUSTOMER = newId();
const CUSTOMERS = {
  [OWN_CUSTOMER]: { _id: OWN_CUSTOMER, userId: USERS.owner.id },
  [OTHER_CUSTOMER]: { _id: OTHER_CUSTOMER, userId: OTHER_USER_ID }
};

const OWN_ORDER = newId();
const OTHER_ORDER = newId();
const MISSING_ID = newId();
const ORDERS = {
  [OWN_ORDER]: { _id: OWN_ORDER, customerId: OWN_CUSTOMER, paymentMethod: 'CASH' },
  [OTHER_ORDER]: { _id: OTHER_ORDER, customerId: OTHER_CUSTOMER, paymentMethod: 'CARD' }
};

// la misma orden pero con el cliente completo (lo que regresa populate)
const populated = (order) => order && { ...order, customerId: CUSTOMERS[order.customerId] };

const VALID_ORDER = {
  customerId: OWN_CUSTOMER,
  items: [{ productId: 20, quantity: 1, unitPrice: 500 }],
  totals: { subtotal: 500, total: 500 }
};

// valida con el schema real de mongoose pero sin guardar en la BD
async function validateOnly(body) {
  const doc = new Order(body);
  await doc.validate();
  return doc;
}

beforeAll(loadPermissions);

beforeEach(() => {
  mockUsers();
  // orderOwner busca la orden y luego el cliente para saber el dueño
  jest.spyOn(Order, 'findById').mockImplementation((id) => query(ORDERS[id] || null, populated(ORDERS[id]) || null));
  jest.spyOn(Customer, 'findById').mockImplementation(async (id) => CUSTOMERS[id] || null);
});

afterEach(() => jest.restoreAllMocks());

describe.each(['en', 'es'])('Orders API con mocks (lang=%s)', (lang) => {
  const url = (path) => `/api/orders${path}?lang=${lang}`;

  // para los 500 no queremos el stack en la salida de la prueba
  const silenceErrors = () => jest.spyOn(console, 'error').mockImplementation(() => {});

  describe('GET /api/orders', () => {
    test('200 lista las órdenes con el cliente', async () => {
      const list = query(null, Object.values(ORDERS).map(populated));
      jest.spyOn(Order, 'find').mockReturnValue(list);
      const res = await request(app).get(url('')).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(msg(lang, 'orders.list'));
      expect(res.body.data).toHaveLength(2);
      expect(list.populate).toHaveBeenCalledWith('customerId');
    });

    test('401 sin token', async () => {
      const res = await request(app).get(url(''));
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin orders:read:any', async () => {
      const find = jest.spyOn(Order, 'find');
      const res = await request(app).get(url('')).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
      expect(find).not.toHaveBeenCalled();
    });

    test('500 si falla la BD, sin detalles internos', async () => {
      silenceErrors();
      jest.spyOn(Order, 'find').mockReturnValue(failingQuery(new Error('conexion perdida')));
      const res = await request(app).get(url('')).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });

  describe('GET /api/orders/:id', () => {
    test('200 regresa la orden con el cliente (populate)', async () => {
      const res = await request(app).get(url(`/${OTHER_ORDER}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(msg(lang, 'orders.found'));
      expect(res.body.data.customerId).toEqual(CUSTOMERS[OTHER_CUSTOMER]);
      const controllerQuery = Order.findById.mock.results.at(-1).value;
      expect(controllerQuery.populate).toHaveBeenCalledWith('customerId');
    });

    test('200 el usuario ve su propia orden', async () => {
      const res = await request(app).get(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(OWN_ORDER);
    });

    test('400 con id mal formado', async () => {
      const res = await request(app).get(url('/abc')).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidId') });
      expect(Order.findById).not.toHaveBeenCalled();
    });

    test('401 sin token', async () => {
      const res = await request(app).get(url(`/${OWN_ORDER}`));
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin permiso', async () => {
      const res = await request(app).get(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.guest));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('403 own: la orden es de otro usuario', async () => {
      const res = await request(app).get(url(`/${OTHER_ORDER}`)).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('404 si no existe', async () => {
      const res = await request(app).get(url(`/${MISSING_ID}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ message: msg(lang, 'orders.notFound') });
    });

    test('500 si falla la BD', async () => {
      silenceErrors();
      Order.findById.mockImplementation(() => failingQuery(new Error('conexion perdida')));
      const res = await request(app).get(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });

  describe('POST /api/orders', () => {
    test('201 crea la orden', async () => {
      jest.spyOn(Order, 'create').mockImplementation(validateOnly);
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send(VALID_ORDER);
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe(msg(lang, 'orders.created'));
      expect(res.body.data.customerId).toBe(OWN_CUSTOMER);
    });

    test('el statusHistory inicial lo genera el servidor e ignora el del cliente', async () => {
      const create = jest.spyOn(Order, 'create').mockImplementation(validateOnly);
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send({
        ...VALID_ORDER,
        statusHistory: [{ status: 'PAID', changedById: OTHER_USER_ID, note: 'pagado' }]
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.statusHistory).toHaveLength(1);
      expect(res.body.data.statusHistory[0]).toMatchObject({ status: 'PENDING', changedById: USERS.owner.id });
      expect(res.body.data.statusHistory[0]).not.toHaveProperty('note');
      expect(create).toHaveBeenCalledWith(expect.objectContaining({
        statusHistory: [{ status: 'PENDING', changedById: USERS.owner.id }]
      }));
    });

    test('sin statusHistory en el body también se crea en PENDING', async () => {
      jest.spyOn(Order, 'create').mockImplementation(validateOnly);
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.admin)).send(VALID_ORDER);
      expect(res.statusCode).toBe(201);
      expect(res.body.data.statusHistory[0]).toMatchObject({ status: 'PENDING', changedById: USERS.admin.id });
    });

    test('400 con body vacío', async () => {
      const create = jest.spyOn(Order, 'create');
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidBody') });
      expect(create).not.toHaveBeenCalled();
    });

    test('400 si mongoose rechaza los datos (sin items)', async () => {
      jest.spyOn(Order, 'create').mockImplementation(validateOnly);
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner))
        .send({ customerId: OWN_CUSTOMER, totals: { subtotal: 1, total: 1 } });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.validation') });
    });

    test('400 si customerId no es un ObjectId', async () => {
      jest.spyOn(Order, 'create').mockImplementation(validateOnly);
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner))
        .send({ ...VALID_ORDER, customerId: 'abc' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.validation') });
    });

    test('401 sin token', async () => {
      const res = await request(app).post(url('')).send(VALID_ORDER);
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin permiso', async () => {
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.guest)).send(VALID_ORDER);
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('500 si falla la BD', async () => {
      silenceErrors();
      jest.spyOn(Order, 'create').mockRejectedValue(new Error('conexion perdida'));
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send(VALID_ORDER);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });

  describe('PUT /api/orders/:id', () => {
    const changes = { paymentMethod: 'TRANSFER' };

    test('200 el usuario actualiza su propia orden con runValidators', async () => {
      const update = jest.spyOn(Order, 'findByIdAndUpdate')
        .mockImplementation(async (id, body) => ({ ...ORDERS[id], ...body }));
      const res = await request(app).put(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.owner)).send(changes);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(msg(lang, 'orders.updated'));
      expect(res.body.data.paymentMethod).toBe('TRANSFER');
      expect(update).toHaveBeenCalledWith(OWN_ORDER, changes, expect.objectContaining({ runValidators: true }));
    });

    test.each([
      ['userId', { userId: OTHER_USER_ID }],
      ['customerId', { customerId: OTHER_CUSTOMER }],
      ['statusHistory', { statusHistory: [{ status: 'DELIVERED', changedById: OTHER_USER_ID }] }]
    ])('no se puede cambiar %s: se quita antes de actualizar', async (field, extra) => {
      const update = jest.spyOn(Order, 'findByIdAndUpdate')
        .mockImplementation(async (id, body) => ({ ...ORDERS[id], ...body }));
      const res = await request(app).put(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.owner))
        .send({ ...changes, ...extra });
      expect(res.statusCode).toBe(200);
      expect(update).toHaveBeenCalledWith(OWN_ORDER, changes, expect.any(Object));
      expect(res.body.data[field]).toEqual(ORDERS[OWN_ORDER][field]);
    });

    test('no se pueden cambiar con operadores de mongo ni rutas con punto', async () => {
      const update = jest.spyOn(Order, 'findByIdAndUpdate')
        .mockImplementation(async (id, body) => ({ ...ORDERS[id], ...body }));
      const res = await request(app).put(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.owner)).send({
        ...changes,
        $set: { customerId: OTHER_CUSTOMER },
        $push: { statusHistory: { status: 'PAID', changedById: USERS.owner.id } },
        'statusHistory.0.status': 'DELIVERED'
      });
      expect(res.statusCode).toBe(200);
      expect(update).toHaveBeenCalledWith(OWN_ORDER, changes, expect.any(Object));
    });

    test('400 si solo se mandan campos que no se pueden cambiar', async () => {
      const update = jest.spyOn(Order, 'findByIdAndUpdate');
      const res = await request(app).put(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.owner))
        .send({ customerId: OTHER_CUSTOMER, statusHistory: [] });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidBody') });
      expect(update).not.toHaveBeenCalled();
    });

    test('400 con id mal formado', async () => {
      const res = await request(app).put(url('/abc')).set('Authorization', bearer(USERS.admin)).send(changes);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidId') });
    });

    test('400 con body vacío', async () => {
      const update = jest.spyOn(Order, 'findByIdAndUpdate');
      const res = await request(app).put(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.owner)).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidBody') });
      expect(update).not.toHaveBeenCalled();
    });

    test('400 si runValidators rechaza los datos', async () => {
      const validationError = await new Order({ ...VALID_ORDER, paymentMethod: 'BITCOIN' }).validate().catch((err) => err);
      expect(validationError).toBeInstanceOf(mongoose.Error.ValidationError);
      jest.spyOn(Order, 'findByIdAndUpdate').mockRejectedValue(validationError);
      const res = await request(app).put(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.owner))
        .send({ paymentMethod: 'BITCOIN' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.validation') });
    });

    test('401 sin token', async () => {
      const res = await request(app).put(url(`/${OWN_ORDER}`)).send(changes);
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin permiso', async () => {
      const res = await request(app).put(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.guest)).send(changes);
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('403 own: la orden es de otro usuario', async () => {
      const update = jest.spyOn(Order, 'findByIdAndUpdate');
      const res = await request(app).put(url(`/${OTHER_ORDER}`)).set('Authorization', bearer(USERS.owner)).send(changes);
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
      expect(update).not.toHaveBeenCalled();
    });

    test('404 si no existe', async () => {
      const res = await request(app).put(url(`/${MISSING_ID}`)).set('Authorization', bearer(USERS.admin)).send(changes);
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ message: msg(lang, 'orders.notFound') });
    });

    test('500 si falla la BD', async () => {
      silenceErrors();
      jest.spyOn(Order, 'findByIdAndUpdate').mockRejectedValue(new Error('conexion perdida'));
      const res = await request(app).put(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.admin)).send(changes);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });

  describe('DELETE /api/orders/:id', () => {
    test('200 el usuario elimina su propia orden', async () => {
      const remove = jest.spyOn(Order, 'findByIdAndDelete').mockResolvedValue(ORDERS[OWN_ORDER]);
      const res = await request(app).delete(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ message: msg(lang, 'orders.deleted'), data: { id: OWN_ORDER } });
      expect(remove).toHaveBeenCalledWith(OWN_ORDER);
    });

    test('400 con id mal formado', async () => {
      const res = await request(app).delete(url('/abc')).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidId') });
    });

    test('401 sin token', async () => {
      const res = await request(app).delete(url(`/${OWN_ORDER}`));
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin permiso', async () => {
      const res = await request(app).delete(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.guest));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('403 own: la orden es de otro usuario', async () => {
      const remove = jest.spyOn(Order, 'findByIdAndDelete');
      const res = await request(app).delete(url(`/${OTHER_ORDER}`)).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
      expect(remove).not.toHaveBeenCalled();
    });

    test('404 si no existe', async () => {
      const res = await request(app).delete(url(`/${MISSING_ID}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ message: msg(lang, 'orders.notFound') });
    });

    test('500 si falla la BD', async () => {
      silenceErrors();
      jest.spyOn(Order, 'findByIdAndDelete').mockRejectedValue(new Error('conexion perdida'));
      const res = await request(app).delete(url(`/${OWN_ORDER}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });
});

// mongoose se importa para que la prueba falle si alguien conecta por accidente
test('las pruebas no abren conexión a MongoDB', () => {
  expect(mongoose.connection.readyState).toBe(0);
});
