const express = require('express');
const { protectFamily } = require('../middleware/familyAuth');
const ctrl = require('../controllers/familyController');

const router = express.Router();

// Public — no auth needed
router.post('/login', ctrl.login);

// Protected — requires family JWT
router.get('/latest',   protectFamily, ctrl.getLatest);
router.get('/timeline', protectFamily, ctrl.getTimeline);

module.exports = router;
