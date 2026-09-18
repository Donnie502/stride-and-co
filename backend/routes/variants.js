const express = require('express');
const router = express.Router();
const variantsController = require('../controllers/variants');

router.post('/',variantsController.createVariant);
router.get('/',variantsController.getVariant);
router.get('/:id',variantsController.getVariantById);
router.put('/:id',variantsController.putVariant);
router.delete('/:id',variantsController.destroyVariant);

module.exports = router;