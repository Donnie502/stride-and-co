const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { Customer } = require('../models/mongo');
const {
  USERS, OTHER_USER_ID, loadPermissions, mockUsers, bearer, newId, msg
} = require('./helpers/apiMocks');

// cliente del usuario owner y cliente de otro usuario
const OWN_ID = newId();
const OTHER_ID = newId();
const MISSING_ID = newId();
const CUSTOMERS = {
  [OWN_ID]: { _id: OWN_ID, userId: USERS.owner.id, email: 'owner@example.com' },
  [OTHER_ID]: { _id: OTHER_ID, userId: OTHER_USER_ID, email: 'otro@example.com' }
};

// findById regresa el cliente si existe (lo usan customerOwner y el controller)
function mockFindById() {
  return jest.spyOn(Customer, 'findById').mockImplementation(async (id) => CUSTOMERS[id] || null);
}

// valida con el schema real de mongoose pero sin guardar en la BD
async function validateOnly(body) {
  const doc = new Customer(body);
  await doc.validate();
  return doc;
}

beforeAll(loadPermissions);

beforeEach(() => {
  mockUsers();
  mockFindById();
});

afterEach(() => jest.restoreAllMocks());

describe.each(['en', 'es'])('Customers API con mocks (lang=%s)', (lang) => {
  const url = (path) => `/api/customers${path}?lang=${lang}`;

  // para los 500 no queremos el stack en la salida de la prueba
  const silenceErrors = () => jest.spyOn(console, 'error').mockImplementation(() => {});

  describe('GET /api/customers', () => {
    test('200 lista los clientes', async () => {
      jest.spyOn(Customer, 'find').mockResolvedValue(Object.values(CUSTOMERS));
      const res = await request(app).get(url('')).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(msg(lang, 'customers.list'));
      expect(res.body.data).toHaveLength(2);
    });

    test('401 sin token', async () => {
      const res = await request(app).get(url(''));
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin customers:read:any', async () => {
      const find = jest.spyOn(Customer, 'find');
      const res = await request(app).get(url('')).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
      expect(find).not.toHaveBeenCalled();
    });

    test('500 si falla la BD, sin detalles internos', async () => {
      silenceErrors();
      jest.spyOn(Customer, 'find').mockRejectedValue(new Error('conexion perdida'));
      const res = await request(app).get(url('')).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });

  describe('GET /api/customers/:id', () => {
    test('200 el admin ve cualquier cliente', async () => {
      const res = await request(app).get(url(`/${OTHER_ID}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(msg(lang, 'customers.found'));
      expect(res.body.data._id).toBe(OTHER_ID);
    });

    test('200 el usuario ve su propio cliente', async () => {
      const res = await request(app).get(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(OWN_ID);
    });

    test('400 con id mal formado', async () => {
      const res = await request(app).get(url('/abc')).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidId') });
      expect(Customer.findById).not.toHaveBeenCalled();
    });

    test('401 sin token', async () => {
      const res = await request(app).get(url(`/${OWN_ID}`));
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin permiso', async () => {
      const res = await request(app).get(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.guest));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('403 own: el cliente es de otro usuario', async () => {
      const res = await request(app).get(url(`/${OTHER_ID}`)).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('404 si no existe', async () => {
      const res = await request(app).get(url(`/${MISSING_ID}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ message: msg(lang, 'customers.notFound') });
    });

    test('500 si falla la BD', async () => {
      silenceErrors();
      Customer.findById.mockRejectedValue(new Error('conexion perdida'));
      const res = await request(app).get(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });

  describe('POST /api/customers', () => {
    const body = { userId: USERS.owner.id, email: 'nuevo@example.com' };

    test('201 crea el cliente', async () => {
      jest.spyOn(Customer, 'create').mockImplementation(validateOnly);
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send(body);
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe(msg(lang, 'customers.created'));
      expect(res.body.data.email).toBe('nuevo@example.com');
    });

    test('400 con body vacío', async () => {
      const create = jest.spyOn(Customer, 'create');
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidBody') });
      expect(create).not.toHaveBeenCalled();
    });

    test('400 con un arreglo en lugar de un objeto', async () => {
      const create = jest.spyOn(Customer, 'create');
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send([body, body]);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidBody') });
      expect(create).not.toHaveBeenCalled();
    });

    test('400 si mongoose rechaza los datos (falta userId)', async () => {
      jest.spyOn(Customer, 'create').mockImplementation(validateOnly);
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send({ email: 'x@example.com' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.validation') });
    });

    test('400 si se repite un campo único (error 11000)', async () => {
      const duplicate = Object.assign(new Error('E11000 duplicate key'), { name: 'MongoServerError', code: 11000 });
      jest.spyOn(Customer, 'create').mockRejectedValue(duplicate);
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send(body);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.duplicate') });
    });

    test('401 sin token', async () => {
      const res = await request(app).post(url('')).send(body);
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin permiso', async () => {
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.guest)).send(body);
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('500 si falla la BD', async () => {
      silenceErrors();
      jest.spyOn(Customer, 'create').mockRejectedValue(new Error('conexion perdida'));
      const res = await request(app).post(url('')).set('Authorization', bearer(USERS.owner)).send(body);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });

  describe('PUT /api/customers/:id', () => {
    const changes = { phone: '614-111-1111' };

    test('200 el usuario actualiza su propio cliente', async () => {
      const update = jest.spyOn(Customer, 'findByIdAndUpdate')
        .mockImplementation(async (id, body) => ({ ...CUSTOMERS[id], ...body }));
      const res = await request(app).put(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.owner)).send(changes);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(msg(lang, 'customers.updated'));
      expect(res.body.data.phone).toBe('614-111-1111');
      expect(update).toHaveBeenCalledWith(OWN_ID, changes, expect.objectContaining({ runValidators: true }));
    });

    test('400 con id mal formado', async () => {
      const res = await request(app).put(url('/abc')).set('Authorization', bearer(USERS.admin)).send(changes);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidId') });
    });

    test('400 con body vacío', async () => {
      const update = jest.spyOn(Customer, 'findByIdAndUpdate');
      const res = await request(app).put(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.owner)).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidBody') });
      expect(update).not.toHaveBeenCalled();
    });

    test('400 si runValidators rechaza los datos', async () => {
      const doc = new Customer({ userId: 1, addresses: [{ type: 'OTRO' }] });
      const validationError = await doc.validate().catch((err) => err);
      expect(validationError).toBeInstanceOf(mongoose.Error.ValidationError);
      jest.spyOn(Customer, 'findByIdAndUpdate').mockRejectedValue(validationError);
      const res = await request(app).put(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.owner))
        .send({ addresses: [{ type: 'OTRO' }] });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.validation') });
    });

    test('401 sin token', async () => {
      const res = await request(app).put(url(`/${OWN_ID}`)).send(changes);
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin permiso', async () => {
      const res = await request(app).put(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.guest)).send(changes);
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('403 own: el cliente es de otro usuario', async () => {
      const update = jest.spyOn(Customer, 'findByIdAndUpdate');
      const res = await request(app).put(url(`/${OTHER_ID}`)).set('Authorization', bearer(USERS.owner)).send(changes);
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
      expect(update).not.toHaveBeenCalled();
    });

    test('404 si no existe', async () => {
      const res = await request(app).put(url(`/${MISSING_ID}`)).set('Authorization', bearer(USERS.admin)).send(changes);
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ message: msg(lang, 'customers.notFound') });
    });

    test('500 si falla la BD', async () => {
      silenceErrors();
      jest.spyOn(Customer, 'findByIdAndUpdate').mockRejectedValue(new Error('conexion perdida'));
      const res = await request(app).put(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.admin)).send(changes);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });

  describe('DELETE /api/customers/:id', () => {
    test('200 el usuario elimina su propio cliente', async () => {
      const remove = jest.spyOn(Customer, 'findByIdAndDelete').mockResolvedValue(CUSTOMERS[OWN_ID]);
      const res = await request(app).delete(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ message: msg(lang, 'customers.deleted'), data: { id: OWN_ID } });
      expect(remove).toHaveBeenCalledWith(OWN_ID);
    });

    test('400 con id mal formado', async () => {
      const res = await request(app).delete(url('/abc')).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: msg(lang, 'common.invalidId') });
    });

    test('401 sin token', async () => {
      const res = await request(app).delete(url(`/${OWN_ID}`));
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: msg(lang, 'auth.unauthorized') });
    });

    test('403 sin permiso', async () => {
      const res = await request(app).delete(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.guest));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
    });

    test('403 own: el cliente es de otro usuario', async () => {
      const remove = jest.spyOn(Customer, 'findByIdAndDelete');
      const res = await request(app).delete(url(`/${OTHER_ID}`)).set('Authorization', bearer(USERS.owner));
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: msg(lang, 'auth.forbidden') });
      expect(remove).not.toHaveBeenCalled();
    });

    test('404 si no existe', async () => {
      const res = await request(app).delete(url(`/${MISSING_ID}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ message: msg(lang, 'customers.notFound') });
    });

    test('500 si falla la BD', async () => {
      silenceErrors();
      jest.spyOn(Customer, 'findByIdAndDelete').mockRejectedValue(new Error('conexion perdida'));
      const res = await request(app).delete(url(`/${OWN_ID}`)).set('Authorization', bearer(USERS.admin));
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ message: msg(lang, 'common.internal') });
    });
  });
});

// mongoose se importa para que la prueba falle si alguien conecta por accidente
test('las pruebas no abren conexión a MongoDB', () => {
  expect(mongoose.connection.readyState).toBe(0);
});
