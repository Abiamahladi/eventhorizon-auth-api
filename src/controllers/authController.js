/**
 * MODULE: Auth controller
 * ---------------------------------------------------------------
 * The business logic for:
 *   register, verifyEmail, resendVerification, login
 * Input has already been validated by Joi before these functions run.
 */
const User = require('../models/User');
const { AppError, asyncHandler } = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const { generateVerificationToken, hashToken } = require('../utils/verificationToken');
const { sendVerificationEmail } = require('../utils/sendEmail');

/**
 * POST /api/auth/register
 * Creates an UNVERIFIED account, stores the hashed verification token
 * and emails the verification link.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Friendly duplicate check (the unique index is the real guarantee).
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const { rawToken, hashedToken, expires } = generateVerificationToken();

  // The password is hashed automatically by the pre-save hook in the model.
  const user = await User.create({
    name,
    email,
    password,
    verificationToken: hashedToken, // only the HASH is stored
    verificationTokenExpires: expires,
  });

  // Send the email. If it fails, the account still exists, so we tell the
  // user to request a new link instead of failing the whole registration.
  try {
    await sendVerificationEmail(user.email, user.name, rawToken);
  } catch (err) {
    console.error('Verification email failed:', err.message);
    return res.status(201).json({
      success: true,
      message:
        'Account created, but we could not send the verification email. ' +
        'Please use the resend-verification endpoint.',
    });
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
  });
});

/**
 * GET /api/auth/verify-email?token=...
 * Marks the account as verified if the token is valid and not expired.
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.validatedQuery;

  // Hash the token from the URL and look for a matching, unexpired record.
  const user = await User.findOne({
    verificationToken: hashToken(token),
    verificationTokenExpires: { $gt: Date.now() }, // $gt = "greater than now" = not expired
  }).select('+verificationToken +verificationTokenExpires');

  if (!user) {
    throw new AppError('Verification link is invalid or has expired.', 400);
  }

  user.isVerified = true;
  // Clear the token so the link can't be used a second time.
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
});

/**
 * POST /api/auth/resend-verification
 * Issues a fresh token and email for an unverified account.
 * The response is always the same, so attackers can't use this
 * endpoint to discover which emails are registered.
 */
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericReply = {
    success: true,
    message: 'If an unverified account exists for this email, a new verification link has been sent.',
  };

  const user = await User.findOne({ email });
  if (!user || user.isVerified) {
    return res.json(genericReply);
  }

  const { rawToken, hashedToken, expires } = generateVerificationToken();
  user.verificationToken = hashedToken; // replaces (invalidates) the old token
  user.verificationTokenExpires = expires;
  await user.save();

  try {
    await sendVerificationEmail(user.email, user.name, rawToken);
  } catch (err) {
    console.error('Resend verification email failed:', err.message);
    throw new AppError('Could not send the verification email. Please try again later.', 502);
  }

  res.json(genericReply);
});

/**
 * POST /api/auth/login
 * Checks credentials, then checks the account is verified, then issues a JWT.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // The password is hidden by default, so we ask for it explicitly.
  const user = await User.findOne({ email }).select('+password');

  // Same message for "no such user" and "wrong password" so attackers
  // can't tell which emails exist.
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Credentials are correct, but unverified users may not log in.
  // (We check this AFTER the password so strangers can't probe account status.)
  if (!user.isVerified) {
    throw new AppError('Please verify your email address before logging in.', 403);
  }

  res.json({
    success: true,
    message: 'Login successful.',
    token: signToken(user._id),
    user: { id: user._id, name: user.name, email: user.email },
  });
});

module.exports = { register, verifyEmail, resendVerification, login };
