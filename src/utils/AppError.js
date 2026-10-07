/**
 * MODULE: AppError + asyncHandler
 * ---------------------------------------------------------------
 * AppError:     an error that carries an HTTP status code, so controllers
 *               can write:  throw new AppError('Email already in use', 409)
 * asyncHandler: wraps async route functions so any thrown error is passed
 *               to the central error handler (no try/catch in every controller).
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // marks it as an expected, safe-to-show error
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { AppError, asyncHandler };
