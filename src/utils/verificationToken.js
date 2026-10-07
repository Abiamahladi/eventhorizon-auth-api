/**
 * MODULE: Email verification token helpers
 * ---------------------------------------------------------------
 * This token is DIFFERENT from the login JWT. Its only job is to prove
 * that whoever clicks the link in the email owns that inbox.
 *
 * How it works:
 *  1. Generate 32 cryptographically secure random bytes -> the RAW token.
 *  2. Email the RAW token to the user inside the link.
 *  3. Store only the SHA-256 HASH of it in the database.
 *  4. When the user clicks the link, hash the token from the URL and
 *     look for a user whose stored hash matches (and hasn't expired).
 *
 * Why hash it? If the database is leaked, the attacker only sees hashes
 * and cannot build valid verification links.
 */
const crypto = require('crypto');

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Returns { rawToken, hashedToken, expires }
 *  - rawToken:    goes in the email link
 *  - hashedToken: goes in the database
 *  - expires:     Date after which the token is invalid
 */
function generateVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex characters
  const hours = Number(process.env.VERIFICATION_TOKEN_EXPIRES_HOURS) || 24;

  return {
    rawToken,
    hashedToken: hashToken(rawToken),
    expires: new Date(Date.now() + hours * 60 * 60 * 1000),
  };
}

module.exports = { generateVerificationToken, hashToken };
