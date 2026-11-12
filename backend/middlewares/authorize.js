const { checkPermission, VALID_ACTIONS, VALID_POSSESSIONS } = require('../services/accessControl');
const createError = require('http-errors');

function authorize(resource, action, possession = 'any', options = {}) {
  if (typeof resource !== 'string' || resource.trim() === '') {
    throw new TypeError('authorize: "resource" debe ser un string no vacío');
  }
  if (!VALID_ACTIONS.includes(action)) {
    throw new TypeError(`authorize: "action" debe ser ${VALID_ACTIONS.join('|')} (recibido "${action}")`);
  }
  if (!VALID_POSSESSIONS.includes(possession)) {
    throw new TypeError(`authorize: "possession" debe ser ${VALID_POSSESSIONS.join('|')} (recibido "${possession}")`);
  }
  if (options.ownerResolver !== undefined && typeof options.ownerResolver !== 'function') {
    throw new TypeError('authorize: "options.ownerResolver" debe ser una función');
  }

  const { ownerResolver } = options;

  // los 401 y 403 se mandan con next y los traduce el manejador central
  return async function authorizeMiddleware(req, res, next) {
    try {
      if (!req.user) {
        return next(createError(401));
      }

      const result = checkPermission({
        roleId: req.user.role_id,
        resource,
        action,
        possession
      });

      if (!result.granted) {
        return next(createError(403));
      }

      req.rbac = {
        role: result.role,
        resource,
        action,
        scope: result.scope,
        attributes: result.attributes
      };

      if (result.scope === 'own' && ownerResolver) {
        const ownerId = await ownerResolver(req);
        const exists = ownerId !== undefined && ownerId !== null;

        if (exists && String(ownerId) !== String(req.user.id)) {
          // el recurso es de otro usuario
          return next(createError(403));
        }
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { authorize };