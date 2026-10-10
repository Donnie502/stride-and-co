var express = require('express');
var router = express.Router();
var ordersController = require('../controllers/orders');

router.get('/', ordersController.list);
router.get('/:id', ordersController.find);
router.post('/', ordersController.create);
router.put('/:id', ordersController.update);
router.delete('/:id', ordersController.destroy);

module.exports = router;