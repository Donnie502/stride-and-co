var express = require('express');
var router = express.Router();

const controller = require('../../controllers/api/index');

router.get('/', controller.healthCheck);

module.exports = router;
