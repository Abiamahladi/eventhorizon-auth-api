/**
 * MODULE: Joi validation middleware
 * ---------------------------------------------------------------
 * Usage in a route:   router.post('/register', validate(registerSchema), controller)
 *
 * - source: which part of the request to validate ('body' or 'query')
 * - abortEarly: false  -> report ALL problems at once, not just the first
 * - stripUnknown: true -> silently drop fields we didn't ask for
 *   (stops someone sending e.g. { "isVerified": true } in the register body)
 * The cleaned, validated data replaces the original so controllers can trust it.
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map((d) => d.message.replace(/"/g, '')),
    });
  }

  // req.query is read-only in newer Express versions, so assign carefully.
  if (source === 'query') {
    req.validatedQuery = value;
  } else {
    req[source] = value;
  }
  next();
};

module.exports = validate;
