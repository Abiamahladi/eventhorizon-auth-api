/**
 * MODULE: Joi validation schemas
 * ---------------------------------------------------------------
 * Every piece of data coming from the client is validated here
 * BEFORE it reaches the controller. Never trust client input.
 */
const Joi = require('joi');

// Password rules: 8-64 characters, at least one letter AND one number.
// (Special characters are allowed too, which makes passwords stronger.)
const passwordRule = Joi.string()
  .min(8)
  .max(64)
  .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must be at most 64 characters long',
    'string.pattern.base': 'Password must contain at least one letter and one number',
  });

// POST /api/auth/register
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: passwordRule,
});

// POST /api/auth/login
// We only check the password is a non-empty string here, NOT the strength rules,
// so that we don't reveal our password policy to someone guessing passwords.
const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

// POST /api/auth/resend-verification
const resendSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});

// GET /api/auth/verify-email?token=...
// The raw token is 32 random bytes written as hex = 64 characters.
const verifyEmailSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
});

module.exports = { registerSchema, loginSchema, resendSchema, verifyEmailSchema };
