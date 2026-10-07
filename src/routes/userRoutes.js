/**
 * MODULE: User routes  (mounted at /api/user)
 * ---------------------------------------------------------------
 * `protect` runs first: no valid JWT (or unverified user) = request stops there.
 */
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getProfile } = require('../controllers/userController');

router.get('/profile', protect, getProfile);

module.exports = router;
