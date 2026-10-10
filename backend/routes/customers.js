var express = require('express');
var router = express.Router();
var customersController = require('../controllers/customers');

router.get('/', customersController.list);
router.get('/:id', customersController.find);
router.post('/', customersController.create);
router.put('/:id', customersController.update);
router.delete('/:id', customersController.destroy);

module.exports = router;