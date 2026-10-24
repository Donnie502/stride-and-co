const { checkPermission, VALID_ACTIONS, VALID_POSSESSIONS } = require('../services/accessControl');

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

  return async function authorizeMiddleware(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = checkPermission({
        roleId: req.user.role_id,
        resource,
        action,
        possession
      });

      if (!result.granted) {
        return res.status(403).json({ message: 'Forbidden' });
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
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { authorize };