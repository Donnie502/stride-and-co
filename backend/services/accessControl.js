const { AccessControl } = require('accesscontrol');
const { Role, Permission } = require('../models/relationals');

const VALID_ACTIONS = ['create', 'read', 'update', 'delete'];
const VALID_POSSESSIONS = ['own', 'any'];

let ac = null;
let roleNamesById = new Map();

function parsePermissionKey(key) {
  const parts = String(key).split(':').map((p) => p.trim());

  if (parts.length !== 3) {
    throw new Error(`Permission.key inválida "${key}": se esperaba recurso:accion:alcance`);
  }

  const [resource, action, possession] = parts;

  if (!resource) {
    throw new Error(`Permission.key inválida "${key}": falta el recurso`);
  }
  if (!VALID_ACTIONS.includes(action)) {
    throw new Error(`Permission.key inválida "${key}": acción "${action}" no es ${VALID_ACTIONS.join('|')}`);
  }
  if (!VALID_POSSESSIONS.includes(possession)) {
    throw new Error(`Permission.key inválida "${key}": alcance "${possession}" no es ${VALID_POSSESSIONS.join('|')}`);
  }

  return { resource, action, possession };
}

function buildGrants(roles) {
  const grants = [];
  const roleNames = new Map();

  for (const role of roles) {
    roleNames.set(Number(role.id), role.name);

    for (const permission of role.permissions || []) {
      try {
        const { resource, action, possession } = parsePermissionKey(permission.key);
        grants.push({
          role: role.name,
          resource,
          action: `${action}:${possession}`,
          attributes: '*'
        });
      } catch (err) {
        console.warn(`[rbac] ${err.message} (rol "${role.name}") -> ignorada`);
      }
    }
  }

  return { grants, roleNames };
}

function applyRoles(roles) {
  const { grants, roleNames } = buildGrants(roles);

  const instance = new AccessControl(grants);
  if (grants.length > 0) instance.lock();

  ac = instance;
  roleNamesById = roleNames;

  return { roles: roleNames.size, grants: grants.length };
}

async function loadRolesFromDb() {
  const roles = await Role.findAll({
    attributes: ['id', 'name'],
    include: [{
      model: Permission,
      as: 'permissions',
      attributes: ['key'],
      through: { attributes: [] }
    }]
  });

  return roles.map((role) => role.get({ plain: true }));
}

async function initAccessControl() {
  const roles = await loadRolesFromDb();
  const summary = applyRoles(roles);

  console.log(`[rbac] ${summary.grants} permisos cargados para ${summary.roles} roles desde la base de datos`);
  if (summary.grants === 0) {
    console.warn('[rbac] No hay permisos en la BD: toda petición protegida responderá 403. ¿Corriste el seeder?');
  }

  return ac;
}

function getAccessControl() {
  if (!ac) {
    throw new Error('AccessControl no está inicializado: llama a initAccessControl() al arrancar la app');
  }
  return ac;
}


function checkPermission({ roleId, resource, action, possession = 'any' }) {
  const instance = getAccessControl();
  const denied = { granted: false, role: null, scope: null, attributes: [] };

  const role = roleNamesById.get(Number(roleId));
  if (!role || !instance.hasRole(role)) return denied;

  const base = { role, resource, action };

  const anyPermission = instance.permission({ ...base, possession: 'any' });
  if (anyPermission.granted) {
    return { granted: true, role, scope: 'any', attributes: anyPermission.attributes };
  }

  if (possession === 'own') {
    const ownPermission = instance.permission({ ...base, possession: 'own' });
    if (ownPermission.granted) {
      return { granted: true, role, scope: 'own', attributes: ownPermission.attributes };
    }
  }

  return { ...denied, role };
}

module.exports = {
  VALID_ACTIONS,
  VALID_POSSESSIONS,
  parsePermissionKey,
  buildGrants,
  applyRoles,
  initAccessControl,
  getAccessControl,
  checkPermission
};