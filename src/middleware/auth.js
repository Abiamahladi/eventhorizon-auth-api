/**
 * MODULE: Authentication middleware (protects routes)
 * ---------------------------------------------------------------
 * Put this before any route that needs a logged-in, VERIFIED user.
 *
 * Steps:
 *  1. Read the token from the "Authorization: Bearer <token>" header
 *  2. Verify the signature and expiry
 *  3. Load the user from the database (so deleted users are rejected)
 *  4. Reject unverified users (even with a valid token)
 *  5. Attach the user to req.user for the next handler
 */
const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');
const { AppError, asyncHandler } = require('../utils/AppError');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Please log in.', 401);
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    // Covers expired tokens, tampered tokens and malformed tokens.
    const message =
      err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.';
    throw new AppError(message, 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('The user for this token no longer exists.', 401);
  }

  if (!user.isVerified) {
    throw new AppError('Please verify your email address to access this resource.', 403);
  }

  req.user = user;
  next();
});

module.exports = { protect };
