var express = require('express');
var router = express.Router();
var ordersController = require('../controllers/orders');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { orderOwner } = require('../middlewares/ownerResolvers');

// GET general: Solo roles con permisos globales (ej. seller, admin) pueden ver todas las órdenes
router.get('/', authenticate, authorize('orders', 'read', 'any'), ordersController.list);

// GET por ID: con own se revisa que la orden sea del usuario, con any pasa directo
router.get('/:id', authenticate, authorize('orders', 'read', 'own', { ownerResolver: orderOwner }), ordersController.find);

// POST: Creación de órdenes
router.post('/', authenticate, authorize('orders', 'create', 'any'), ordersController.create);

// PUT: El usuario solo puede actualizar sus propias órdenes
router.put('/:id', authenticate, authorize('orders', 'update', 'own', { ownerResolver: orderOwner }), ordersController.update);

// DELETE: El usuario solo puede eliminar sus propias órdenes
router.delete('/:id', authenticate, authorize('orders', 'delete', 'own', { ownerResolver: orderOwner }), ordersController.destroy);

module.exports = router;