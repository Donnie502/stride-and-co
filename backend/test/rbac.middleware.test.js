const express = require('express');
const request = require('supertest');

jest.mock('../models/relationals', () => ({
  Role: { findAll: jest.fn() },
  Permission: {}
}));

const { Role } = require('../models/relationals');
const {
  parsePermissionKey,
  buildGrants,
  applyRoles,
  initAccessControl,
  getAccessControl
} = require('../services/accessControl');
const { authorize } = require('../middlewares/authorize');

const ROLES_FROM_DB = [
  {
    id: 1, name: 'user',
    permissions: [
      { key: 'products:read:any' }, { key: 'orders:create:any' },
      { key: 'orders:read:own' }, { key: 'orders:update:own' }
    ]
  },
  {
    id: 2, name: 'seller',
    permissions: [
      { key: 'products:read:any' }, { key: 'orders:create:any' },
      { key: 'orders:read:own' }, { key: 'orders:read:any' }, { key: 'orders:update:own' }
    ]
  },
  {
    id: 3, name: 'admin',
    permissions: [
      { key: 'products:read:any' }, { key: 'products:create:any' },
      { key: 'products:update:any' }, { key: 'products:delete:any' },
      { key: 'orders:read:any' }, { key: 'users:read:any' }
    ]
  },
  { id: 4, name: 'guest', permissions: [] }
];

const fakeAuth = (req, res, next) => {
  if (req.get('x-test-user')) req.user = JSON.parse(req.get('x-test-user'));
  next();
};

const asUser = (id, role_id) => JSON.stringify({ id, role_id });
const USER = (id = 10) => asUser(id, 1);
const SELLER = asUser(20, 2);
const ADMIN = asUser(30, 3);
const GUEST = asUser(40, 4);

const ORDER_OWNERS = { o1: 10, o2: 99 };
const ownerResolver = async (req) => ORDER_OWNERS[req.params.id];

function buildApp() {
  const app = express();
  app.use(fakeAuth);

  app.get('/products', authorize('products', 'read', 'any'), (req, res) => res.json({ ok: true }));
  app.delete('/products/:id', authorize('products', 'delete', 'any'), (req, res) => res.json({ ok: true }));
  app.get('/orders', authorize('orders', 'read', 'any'), (req, res) => res.json({ ok: true }));
  app.get('/orders/:id', authorize('orders', 'read', 'own', { ownerResolver }),
    (req, res) => res.json({ ok: true, scope: req.rbac.scope }));
  app.get('/orders-own-list', authorize('orders', 'read', 'own'),
    (req, res) => res.json({ scope: req.rbac.scope }));

  app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
  return app;
}

describe('parsePermissionKey', () => {
  test('separa recurso, acción y alcance', () => {
    expect(parsePermissionKey('orders:read:own'))
      .toEqual({ resource: 'orders', action: 'read', possession: 'own' });
  });

  test.each(['orders:read', 'orders:read:own:x', ':read:any', 'orders:list:any', 'orders:read:all'])(
    'rechaza la key inválida "%s"', (key) => {
      expect(() => parsePermissionKey(key)).toThrow();
    });
});

describe('buildGrants / carga desde la BD', () => {
  test('transforma Permission.key al formato de accesscontrol', () => {
    const { grants, roleNames } = buildGrants(ROLES_FROM_DB);
    expect(grants).toContainEqual({ role: 'user', resource: 'orders', action: 'read:own', attributes: '*' });
    expect(grants).toContainEqual({ role: 'admin', resource: 'products', action: 'delete:any', attributes: '*' });
    expect(roleNames.get(3)).toBe('admin');
  });

  test('una key mal formada en la BD se ignora y nunca concede acceso', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { grants } = buildGrants([{ id: 9, name: 'x', permissions: [{ key: 'basura' }] }]);
    expect(grants).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('initAccessControl consulta Role.findAll con el JOIN a permissions y carga la librería', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    Role.findAll.mockResolvedValue(ROLES_FROM_DB.map((r) => ({ get: () => r })));

    const ac = await initAccessControl();

    expect(Role.findAll).toHaveBeenCalledWith(expect.objectContaining({
      include: [expect.objectContaining({ as: 'permissions' })]
    }));
    expect(ac.getRoles().sort()).toEqual(['admin', 'seller', 'user']);
    expect(getAccessControl()).toBe(ac);
    log.mockRestore();
  });
});

describe('BD sin sembrar (sin permisos)', () => {
  test('applyRoles no falla con una lista vacía y todo se deniega con 403', async () => {
    expect(() => applyRoles([])).not.toThrow();
    expect(() => applyRoles([{ id: 1, name: 'user', permissions: [] }])).not.toThrow();

    const app = buildApp();
    const res = await request(app).get('/products').set('x-test-user', USER());
    expect(res.statusCode).toBe(403);
  });
});

describe('middleware authorize', () => {
  let app;
  beforeAll(() => {
    applyRoles(ROLES_FROM_DB);
    app = buildApp();
  });

  test('ADMIN con products:delete:any puede borrar cualquier producto', async () => {
    const res = await request(app).delete('/products/5').set('x-test-user', ADMIN);
    expect(res.statusCode).toBe(200);
  });

  test('SELLER sin products:delete:any recibe 403', async () => {
    const res = await request(app).delete('/products/5').set('x-test-user', SELLER);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ message: 'Forbidden' });
  });

  test('USER con orders:read:own puede leer su propia orden', async () => {
    const res = await request(app).get('/orders/o1').set('x-test-user', USER(10));
    expect(res.statusCode).toBe(200);
    expect(res.body.scope).toBe('own');
  });

  test('USER con orders:read:own recibe 403 al leer la orden de otro usuario', async () => {
    const res = await request(app).get('/orders/o2').set('x-test-user', USER(10));
    expect(res.statusCode).toBe(403);
  });

  test('USER sin orders:read:any recibe 403 al listar todas las órdenes', async () => {
    const res = await request(app).get('/orders').set('x-test-user', USER(10));
    expect(res.statusCode).toBe(403);
  });

  test('SELLER con orders:read:any puede listar todas las órdenes', async () => {
    const res = await request(app).get('/orders').set('x-test-user', SELLER);
    expect(res.statusCode).toBe(200);
  });

  test('ADMIN/SELLER con :any leen una orden ajena sin verificar dueño (scope any)', async () => {
    const res = await request(app).get('/orders/o2').set('x-test-user', SELLER);
    expect(res.statusCode).toBe(200);
    expect(res.body.scope).toBe('any');
  });

  test('own sin ownerResolver deja req.rbac.scope = "own" para filtrar listados', async () => {
    const res = await request(app).get('/orders-own-list').set('x-test-user', USER(10));
    expect(res.statusCode).toBe(200);
    expect(res.body.scope).toBe('own');
  });

  test('orden inexistente con scope own pasa al controller (que responde 404)', async () => {
    const res = await request(app).get('/orders/zzz').set('x-test-user', USER(10));
    expect(res.statusCode).toBe(200);
  });

  test('sin usuario autenticado responde 401 (no 403)', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(401);
  });

  test('rol sin permisos responde 403', async () => {
    const res = await request(app).get('/products').set('x-test-user', GUEST);
    expect(res.statusCode).toBe(403);
  });

  test('role_id inexistente o nulo responde 403', async () => {
    const res1 = await request(app).get('/products').set('x-test-user', asUser(1, 999));
    const res2 = await request(app).get('/products').set('x-test-user', asUser(1, null));
    expect(res1.statusCode).toBe(403);
    expect(res2.statusCode).toBe(403);
  });

  test('argumentos inválidos al definir la ruta lanzan error inmediatamente', () => {
    expect(() => authorize('orders', 'raed', 'own')).toThrow(TypeError);
    expect(() => authorize('orders', 'read', 'todos')).toThrow(TypeError);
    expect(() => authorize('', 'read', 'any')).toThrow(TypeError);
    expect(() => authorize('orders', 'read', 'own', { ownerResolver: 'no-fn' })).toThrow(TypeError);
  });
});