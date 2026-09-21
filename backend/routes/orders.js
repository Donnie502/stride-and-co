var express = require('express');
var router = express.Router();
var ordersController = require('../controllers/orders');

router.get('/', ordersController.getAllOrders);
router.get('/:id', ordersController.getOrderById);
router.post('/', ordersController.createOrder);
router.put('/:id', ordersController.updateOrder);
router.patch('/:id/status', ordersController.updateOrderStatus);   
router.delete('/:id', ordersController.deleteOrder);

module.exports = router;