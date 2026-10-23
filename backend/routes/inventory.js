const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory');

router.post('/',inventoryController.create);
router.get('/',inventoryController.list);
router.get('/:id',inventoryController.find);
router.put('/:id',inventoryController.update);
router.delete('/:id',inventoryController.destroy);

module.exports = router;