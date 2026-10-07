/**
 * MODULE: User model (Mongoose schema)
 * ---------------------------------------------------------------
 * Describes what a user looks like in MongoDB.
 *
 * Security notes:
 *  - `password` stores a bcrypt HASH, never the plain password.
 *  - `select: false` means the password (and verification fields) are
 *    NOT returned by queries unless we explicitly ask with .select('+field').
 *    This prevents accidentally leaking them in API responses.
 *  - We store only the SHA-256 HASH of the email verification token.
 *    If the database leaks, the attacker can't use the hashes to verify accounts.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true, // creates a unique index: no two users share an email
      lowercase: true, // "Ada@Mail.com" and "ada@mail.com" are the same person
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },

    // ----- Email verification -----
    isVerified: {
      type: Boolean,
      default: false, // every new account starts unverified
    },
    verificationToken: {
      type: String, // SHA-256 hash of the token emailed to the user
      select: false,
    },
    verificationTokenExpires: {
      type: Date, // after this moment the token is no longer valid
      select: false,
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

/**
 * Hash the password automatically before saving, but only when it
 * was set or changed (so updating a user's name doesn't re-hash it).
 * The "12" is the cost factor: higher = slower to brute force.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/**
 * Instance method: compare a plain password against the stored hash.
 * Returns true/false. Used during login.
 */
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
