// helper para las pruebas con mocks de customers y orders
// no usa MongoDB ni PostgreSQL: todo se simula con jest.spyOn
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { User, Role } = require('../../models/sql');
const { initAccessControl } = require('../../services/accessControl');
const { secret, issuer, audience } = require('../../config/jwt');
const es = require('../../locales/es.json');
const en = require('../../locales/en.json');

// roles como vendrian de la BD (mismo formato que en rbac.middleware.test.js)
const ROLES_FROM_DB = [
  {
    id: 1, name: 'admin',
    permissions: [
      { key: 'customers:create:any' }, { key: 'customers:read:any' },
      { key: 'customers:update:any' }, { key: 'customers:delete:any' },
      { key: 'orders:create:any' }, { key: 'orders:read:any' },
      { key: 'orders:update:any' }, { key: 'orders:delete:any' }
    ]
  },
  {
    id: 3, name: 'user',
    permissions: [
      { key: 'customers:create:any' }, { key: 'customers:read:own' },
      { key: 'customers:update:own' }, { key: 'customers:delete:own' },
      { key: 'orders:create:any' }, { key: 'orders:read:own' },
      { key: 'orders:update:own' }, { key: 'orders:delete:own' }
    ]
  },
  // rol sin ningun permiso
  { id: 4, name: 'guest', permissions: [] }
];

const USERS = {
  admin: { id: 1, role_id: 1, active: true },
  owner: { id: 3, role_id: 3, active: true },
  guest: { id: 4, role_id: 4, active: true }
};

// id de un usuario que no es el que hace la peticion
const OTHER_USER_ID = 99;

// carga los permisos simulando la consulta a la BD
async function loadPermissions() {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const findAll = jest.spyOn(Role, 'findAll').mockResolvedValue(ROLES_FROM_DB.map((r) => ({ get: () => r })));
  await initAccessControl();
  findAll.mockRestore();
  log.mockRestore();
}

// authenticate busca al usuario del token con User.findByPk
function mockUsers() {
  return jest.spyOn(User, 'findByPk').mockImplementation(async (id) => {
    return Object.values(USERS).find((u) => u.id === Number(id)) || null;
  });
}

// token firmado igual que en el login
function tokenFor(user) {
  return jwt.sign({ sub: String(user.id) }, secret, { algorithm: 'HS256', expiresIn: '15m', issuer, audience });
}

const bearer = (user) => `Bearer ${tokenFor(user)}`;

// simula una consulta de mongoose: se puede hacer await directo o encadenar .populate()
function query(value, populated = value) {
  const promise = Promise.resolve(value);
  promise.populate = jest.fn(() => Promise.resolve(populated));
  return promise;
}

// consulta que falla, para probar el 500
function failingQuery(error) {
  const promise = Promise.reject(error);
  promise.catch(() => {});
  promise.populate = jest.fn(() => Promise.reject(error));
  return promise;
}

const newId = () => new mongoose.Types.ObjectId().toString();

// busca el texto esperado en los json de idiomas, ej. msg('es', 'orders.notFound')
function msg(lang, key) {
  const file = lang === 'es' ? es : en;
  return key.split('.').reduce((obj, part) => obj[part], file);
}

module.exports = {
  USERS, OTHER_USER_ID, loadPermissions, mockUsers, bearer, query, failingQuery, newId, msg
};
