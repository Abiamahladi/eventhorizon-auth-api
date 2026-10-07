/**
 * MODULE: User controller
 * ---------------------------------------------------------------
 * Logic for routes that need a logged-in, verified user.
 * The `protect` middleware has already attached the user to req.user.
 */

/**
 * GET /api/user/profile
 * Returns the current user's profile. The password and verification
 * fields are never included (they are `select: false` in the model).
 */
const getProfile = (req, res) => {
  const { _id, name, email, isVerified, createdAt } = req.user;
  res.json({
    success: true,
    user: { id: _id, name, email, isVerified, createdAt },
  });
};

module.exports = { getProfile };
