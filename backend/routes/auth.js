var express = require('express');
var router = express.Router();
var controller = require('../controllers/auth');
const { authenticate } = require('../middlewares/authenticate');

router.get('/me', authenticate, controller.me);
router.post('/login', controller.login);

module.exports = router;