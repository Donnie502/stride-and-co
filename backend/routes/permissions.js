const express = require('express');
const router = express.Router();

const controller = require('../controllers/permissions');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');

// solo admin tiene estos permisos en el seed
router.use(authenticate);

/* POST permission create */
router.post('/', authorize('permissions', 'create', 'any'), controller.create);

/* GET permissions listing */
router.get('/', authorize('permissions', 'read', 'any'), controller.list);

/* GET permission by id */
router.get('/:id', authorize('permissions', 'read', 'any'), controller.find);

/* PUT permission to update */
router.put('/:id', authorize('permissions', 'update', 'any'), controller.update);

/* DELETE permission by id */
router.delete('/:id', authorize('permissions', 'delete', 'any'), controller.destroy);

module.exports = router;