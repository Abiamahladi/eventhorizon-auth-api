/**
 * MODULE: Auth routes  (mounted at /api/auth)
 * ---------------------------------------------------------------
 * Each route = URL + (optional) validation + controller.
 */
const router = require('express').Router();
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  resendSchema,
  verifyEmailSchema,
} = require('../validators/authValidator');
const {
  register,
  verifyEmail,
  resendVerification,
  login,
} = require('../controllers/authController');

router.post('/register', validate(registerSchema), register);
router.get('/verify-email', validate(verifyEmailSchema, 'query'), verifyEmail);
router.post('/resend-verification', validate(resendSchema), resendVerification);
router.post('/login', validate(loginSchema), login);

module.exports = router;
