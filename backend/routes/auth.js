var express = require('express');
var router = express.Router();
var controller = require('../controllers/auth');

router.post('/login', controller.login);

module.exports = router;