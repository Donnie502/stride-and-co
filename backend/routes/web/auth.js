const express = require('express');
const router = express.Router();
const authWebController = require('../../controllers/web/auth');

router.get('/login', authWebController.showLoginForm);
router.post('/login', authWebController.login);
router.post('/logout', authWebController.logout);

module.exports = router;