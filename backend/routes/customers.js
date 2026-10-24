var express = require('express');
var router = express.Router();
var customersController = require('../controllers/customers');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { customerOwner } = require('../middlewares/ownerResolvers');

// todas las rutas de clientes piden token
router.use(authenticate);

router.get('/', authorize('customers', 'read', 'any'), customersController.list);
router.get('/:id', authorize('customers', 'read', 'own', { ownerResolver: customerOwner }), customersController.find);
router.post('/', authorize('customers', 'create', 'any'), customersController.create);
router.put('/:id', authorize('customers', 'update', 'own', { ownerResolver: customerOwner }), customersController.update);
router.delete('/:id', authorize('customers', 'delete', 'own', { ownerResolver: customerOwner }), customersController.destroy);

module.exports = router;