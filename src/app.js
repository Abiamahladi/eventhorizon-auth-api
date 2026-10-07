/**
 * MODULE: Express app
 * ---------------------------------------------------------------
 * Builds the Express application (middleware + routes) WITHOUT
 * starting the server or connecting to the database. Keeping this
 * separate from server.js makes the app easy to test.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security headers (hides X-Powered-By, sets safe defaults, etc.)
app.use(helmet());

// Allow the frontend to call this API from the browser.
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// Parse JSON bodies. The size limit stops huge payloads.
app.use(express.json({ limit: '10kb' }));

// Rate limit auth endpoints to slow down brute-force and spam attempts.
// 20 requests per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Simple health check, handy for testing that the server is up.
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);

// Must come AFTER the routes: handle unknown URLs, then all errors.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
