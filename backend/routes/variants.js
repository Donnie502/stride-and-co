const express = require('express');
const router = express.Router();
const variantsController = require('../controllers/variants');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');

// todas las rutas de variants piden token
router.use(authenticate);

router.post('/', authorize('variants', 'create', 'any'), variantsController.createVariant);
router.get('/', authorize('variants', 'read', 'any'), variantsController.getVariant);
router.get('/:id', authorize('variants', 'read', 'any'), variantsController.getVariantById);
router.put('/:id', authorize('variants', 'update', 'any'), variantsController.putVariant);
router.delete('/:id', authorize('variants', 'delete', 'any'), variantsController.destroyVariant);

module.exports = router;