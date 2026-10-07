/**
 * ENTRY POINT
 * ---------------------------------------------------------------
 * 1. Load environment variables from .env
 * 2. Connect to MongoDB
 * 3. Start the HTTP server
 */
require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Fail fast if the JWT secret is missing: signing tokens without it is unsafe.
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Set it in your .env file.');
  process.exit(1);
}

connectDB().then(() => {
  app.listen(PORT, () => console.log(`EventHorizon API running on port ${PORT}`));
});
