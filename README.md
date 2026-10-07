# EventHorizon Auth API

Backend foundation for EventHorizon (a platform for managing local tech meetups).
Built with **Node.js, Express, MongoDB (Mongoose)**. It handles registration, **token-based email verification**, login with **JWT**, and protected routes.

## Features

- Registration with **Joi** validation (password: 8-64 chars, at least one letter and one number)
- Passwords hashed with **bcrypt** (`bcryptjs`, cost factor 12)
- Email verification via a **unique, time-limited link** (no OTP). Only the **SHA-256 hash** of the token is stored in the database
- Login issues a **JWT**; **unverified users cannot log in or reach protected routes**
- Protected route `GET /api/user/profile`
- Security extras: `helmet`, CORS, rate limiting on `/api/auth`, body size limit, same error message for wrong email/password
- Consistent JSON errors with proper HTTP status codes

## Project structure

```
server.js                      Entry point: loads .env, connects DB, starts server
src/
  app.js                       Express app (middleware + routes)
  config/db.js                 MongoDB connection
  models/User.js               User schema, password hashing, comparePassword()
  validators/authValidator.js  Joi schemas
  utils/
    AppError.js                Custom error class + asyncHandler
    jwt.js                     Sign/verify login JWTs
    verificationToken.js       Generate + hash email verification tokens
    sendEmail.js               Nodemailer: sends the verification email
  middleware/
    validate.js                Runs a Joi schema on body/query
    auth.js                    `protect`: JWT check + verified-only
    errorHandler.js            404 + central error handler
  controllers/
    authController.js          register, verifyEmail, resendVerification, login
    userController.js          getProfile
  routes/
    authRoutes.js              /api/auth/*
    userRoutes.js              /api/user/*
postman_collection.json        Import into Postman to test every endpoint
```

## Setup (local)

**Requirements:** Node.js 18+, a MongoDB database (local or MongoDB Atlas), and an SMTP account (Mailtrap is easiest for development).

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create your `.env` file**
   ```bash
   cp .env.example .env
   ```
3. **Fill in the values** in `.env`:

   | Variable | Meaning |
   |---|---|
   | `PORT` | Port the API runs on (default 5000) |
   | `MONGO_URI` | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/eventhorizon` |
   | `JWT_SECRET` | Long random string. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | Login token lifetime, e.g. `1d` |
   | `VERIFICATION_TOKEN_EXPIRES_HOURS` | How long the email link is valid (default 24) |
   | `FRONTEND_URL` | Base URL of the frontend. The email link is `FRONTEND_URL/verify-email?token=...` |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Your SMTP credentials |
   | `EMAIL_FROM` | Sender shown in the email |

   **Mailtrap:** create a free inbox at mailtrap.io, open it, choose "SMTP", and copy the host, port, username and password.
   **Gmail:** host `smtp.gmail.com`, port `587`, and use an [App Password](https://support.google.com/accounts/answer/185833), not your normal password.

4. **Run**
   ```bash
   npm run dev     # auto-restarts on file changes
   # or
   npm start
   ```
5. Check it works: `GET http://localhost:5000/api/health` returns `{ "success": true, "status": "ok" }`.

## API endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account, send verification email |
| GET | `/api/auth/verify-email?token=...` | No | Verify the email using the token from the link |
| POST | `/api/auth/resend-verification` | No | Send a fresh verification link |
| POST | `/api/auth/login` | No | Returns a JWT (verified users only) |
| GET | `/api/user/profile` | Bearer JWT | Current user's profile (verified users only) |

### Register
`POST /api/auth/register`
```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "Passw0rd123" }
```
`201` success, `400` validation error, `409` email already registered.

### Verify email
`GET /api/auth/verify-email?token=<64-char token from the email link>`
`200` verified, `400` token invalid or expired.

### Login
`POST /api/auth/login`
```json
{ "email": "ada@example.com", "password": "Passw0rd123" }
```
`200` returns `{ token, user }`, `401` wrong credentials, `403` email not verified.

### Profile (protected)
`GET /api/user/profile` with header `Authorization: Bearer <token>`
`200` profile, `401` missing/invalid/expired token, `403` unverified.

## How the email verification works

1. On register, the server creates 32 random bytes (the **raw token**), stores only its **SHA-256 hash** plus an expiry time, and emails a link containing the raw token.
2. The user clicks the link, the frontend page `/verify-email` reads `token` from the URL and calls `GET /api/auth/verify-email?token=...`.
3. The server hashes the received token, finds a user with that hash whose expiry is still in the future, sets `isVerified = true`, and deletes the token so the link works only once.
4. Login and `/api/user/profile` both reject unverified accounts.

This token is completely separate from the login JWT.

## Testing with Postman

1. Import `postman_collection.json`.
2. Run **Register**, then open your Mailtrap inbox and copy the `token` from the link.
3. Paste it into the collection variable `verifyToken` (or into the Verify request's query), then run **Verify Email**.
4. Run **Login**. The collection saves the returned JWT automatically, so **Get Profile** works right after.

## Notes

- `bcryptjs` is used (a pure JavaScript bcrypt implementation) so installation works on every OS without native build tools. It produces standard bcrypt hashes.
- For production: use HTTPS, set a strong `JWT_SECRET`, restrict `FRONTEND_URL` for CORS, and use a real email provider.
