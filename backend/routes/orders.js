var express = require('express');
var router = express.Router();
var ordersController = require('../controllers/orders');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { orderOwner } = require('../middlewares/ownerResolvers');

// todas las rutas de ordenes piden token
router.use(authenticate);

router.get('/', authorize('orders', 'read', 'any'), ordersController.list);
// con own se revisa que la orden sea del usuario, con any pasa directo
router.get('/:id', authorize('orders', 'read', 'own', { ownerResolver: orderOwner }), ordersController.find);
router.post('/', authorize('orders', 'create', 'any'), ordersController.create);
router.put('/:id', authorize('orders', 'update', 'own', { ownerResolver: orderOwner }), ordersController.update);
router.delete('/:id', authorize('orders', 'delete', 'own', { ownerResolver: orderOwner }), ordersController.destroy);

module.exports = router;