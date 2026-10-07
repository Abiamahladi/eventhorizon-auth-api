/**
 * MODULE: Central error handling
 * ---------------------------------------------------------------
 * Every error in the app ends up here, so the client always gets a
 * consistent JSON shape:  { success: false, message: "..." }
 */

// Runs when no route matched the URL.
const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Duplicate key error from MongoDB (e.g. two users, same email).
  // This is the safety net for a race condition where two registrations
  // with the same email arrive at the same moment.
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  // Mongoose schema validation error.
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Malformed JSON in the request body.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  }

  // Errors we threw on purpose (AppError) are safe to show to the client.
  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Anything else is a bug. Log the details for us, but show the client nothing sensitive.
  console.error('Unexpected error:', err);
  res.status(500).json({ success: false, message: 'Something went wrong on our side.' });
};

module.exports = { notFound, errorHandler };
