const express = require('express');
const router = express.Router();

const controller = require('../controllers/products');
// Importamos los middlewares
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');

/* POST product create */
// Protegido: Solo quienes tengan products:create:any (ej. admin)
router.post('/', authenticate, authorize('products', 'create', 'any'), controller.create);

/* GET products listing */
// Protegido: Lectura global para los roles permitidos
router.get('/', authenticate, authorize('products', 'read', 'any'), controller.list);

/* GET product by id */
// Protegido: Lectura global para los roles permitidos
router.get('/:id', authenticate, authorize('products', 'read', 'any'), controller.find);

/* PUT product to update */
// Protegido: Solo quienes tengan products:update:any (ej. admin)
router.put('/:id', authenticate, authorize('products', 'update', 'any'), controller.update);

/* DELETE product by id */
// Protegido: Solo quienes tengan products:delete:any (ej. admin)
router.delete('/:id', authenticate, authorize('products', 'delete', 'any'), controller.destroy);

module.exports = router;