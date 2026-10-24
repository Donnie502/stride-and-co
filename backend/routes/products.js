const express = require('express');
const router = express.Router();

const controller = require('../controllers/products');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');

// todas las rutas de productos piden token
router.use(authenticate);

/* POST product create */
router.post('/', authorize('products', 'create', 'any'), controller.create);

/* GET products listing */
router.get('/', authorize('products', 'read', 'any'), controller.list);

/* GET product by id */
router.get('/:id', authorize('products', 'read', 'any'), controller.find);

/* PUT product to update */
router.put('/:id', authorize('products', 'update', 'any'), controller.update);

/* DELETE product by id */
router.delete('/:id', authorize('products', 'delete', 'any'), controller.destroy);

module.exports = router;