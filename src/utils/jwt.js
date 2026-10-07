/**
 * MODULE: Login JWT helpers
 * ---------------------------------------------------------------
 * A JWT (JSON Web Token) is the "ticket" a user gets after logging in.
 * They send it back on every request in the header:
 *     Authorization: Bearer <token>
 *
 * The token is signed with JWT_SECRET, so nobody can forge or alter it
 * without the secret. We only put the user id inside (never the password).
 */
const jwt = require('jsonwebtoken');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    algorithm: 'HS256',
  });
}

function verifyToken(token) {
  // Pin the algorithm so an attacker can't trick us with "alg: none".
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken };
