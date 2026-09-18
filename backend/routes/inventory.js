const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory');

router.post('/',inventoryController.createInventory);
router.get('/',inventoryController.getInventory);
router.get('/:id',inventoryController.getInventoryById);
router.put('/:id',inventoryController.putInventory);
router.delete('/:id',inventoryController.destroyInventory);

module.exports = router;