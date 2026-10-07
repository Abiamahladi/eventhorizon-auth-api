# EventHorizon Auth API

Backend foundation for **EventHorizon**, a platform for managing local tech meetups. This service is the gatekeeper for user accounts: registration, **token-based email verification**, login with a **JSON Web Token (JWT)**, and protected routes.

Built with **Node.js, Express and MongoDB (Mongoose)**.

## Features

- Registration validated with **Joi** (password: 8 to 64 characters, at least one letter and one number)
- Passwords hashed with **bcrypt** (`bcryptjs`, cost factor 12) before saving
- Email verification with a **unique, time-limited link** (no one-time code). Only the **SHA-256 hash** of the token is stored in the database
- Login issues a JSON Web Token. **Unverified users cannot log in or reach protected routes**
- Protected route: `GET /api/user/profile`
- Extra security: `helmet` headers, CORS, rate limiting on `/api/auth` (20 requests per 15 minutes per IP), request body size limit, and the same error message for a wrong email or a wrong password
- Consistent JSON errors with proper HTTP status codes

## Quick start

```bash
npm install
cp .env.example .env     # then fill in the values (see below)
npm run dev              # or: npm start
```

Check it is running: `GET http://localhost:5000/api/health` returns `{"success":true,"status":"ok"}`.

## Setup (local)

**Requirements:** Node.js 18 or newer, a MongoDB database (local or MongoDB Atlas free tier), and an SMTP account (Mailtrap is the easiest for development).

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
   | `MONGO_URI` | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/eventhorizon` or your Atlas `mongodb+srv://...` string |
   | `JWT_SECRET` | Long random string used to sign login tokens. Generate one: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | Login token lifetime, e.g. `1d` |
   | `VERIFICATION_TOKEN_EXPIRES_HOURS` | How long the email verification link stays valid (default 24) |
   | `FRONTEND_URL` | Base URL of the frontend. The email link is `FRONTEND_URL/verify-email?token=...` |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Your SMTP credentials |
   | `EMAIL_FROM` | Sender shown in the email |

   **MongoDB Atlas:** create a free M0 cluster, add a database user, allow your IP under Network Access, then copy the connection string from Connect, Drivers. Put your database name (for example `eventhorizon`) after the host.
   **Mailtrap:** create a free inbox at mailtrap.io, open it, choose the Nodemailer integration, and copy the host, port, username and password.
   **Gmail:** host `smtp.gmail.com`, port `587`, with an [App Password](https://support.google.com/accounts/answer/185833), not your normal password.

4. **Run**
   ```bash
   npm run dev     # restarts on file changes
   npm start       # plain start
   ```

Never commit your `.env` file. It is listed in `.gitignore`.

## API endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create an unverified account and send the verification email |
| GET | `/api/auth/verify-email?token=...` | No | Verify the email using the token from the link |
| POST | `/api/auth/resend-verification` | No | Send a fresh verification link |
| POST | `/api/auth/login` | No | Returns a JSON Web Token (verified users only) |
| GET | `/api/user/profile` | Bearer token | Current user's profile (verified users only) |
| GET | `/api/health` | No | Health check |

## Example requests and responses

### 1. Register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"Passw0rd123"}'
```

`201 Created`
```json
{ "success": true, "message": "Registration successful. Please check your email to verify your account." }
```

A verification email is sent containing a link like `http://localhost:3000/verify-email?token=<64 hex characters>`.

### 2. Verify email

```bash
curl "http://localhost:5000/api/auth/verify-email?token=<token from the email link>"
```

`200 OK`
```json
{ "success": true, "message": "Email verified successfully. You can now log in." }
```

### 3. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"Passw0rd123"}'
```

`200 OK`
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "6ac62a5698df07a5d4baa17e", "name": "Ada Lovelace", "email": "ada@example.com" }
}
```

### 4. Get profile (protected)

```bash
curl http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer <token from login>"
```

`200 OK`
```json
{
  "success": true,
  "user": {
    "id": "6ac62a5698df07a5d4baa17e",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "isVerified": true,
    "createdAt": "2026-10-07T11:17:42.188Z"
  }
}
```

## Error responses

Every error uses the same shape: `{ "success": false, "message": "..." }` (validation errors also include an `errors` array).

| Status | When | Message |
|---|---|---|
| 400 | Invalid registration or login data | `Validation failed` (with a list of problems) |
| 400 | Malformed JSON body | `Invalid JSON in request body.` |
| 400 | Verification token invalid, expired or already used | `Verification link is invalid or has expired.` |
| 401 | Wrong email or password | `Invalid email or password.` |
| 401 | Missing, invalid or expired login token | `Authentication required. Please log in.` / `Invalid token.` / `Session expired. Please log in again.` |
| 403 | Correct login details but email not verified | `Please verify your email address before logging in.` |
| 403 | Valid token but email not verified (protected route) | `Please verify your email address to access this resource.` |
| 404 | Unknown route | `Route not found: ...` |
| 409 | Email already registered | `An account with this email already exists.` |
| 429 | Too many requests to `/api/auth/*` | `Too many requests, please try again later.` |

Example validation error (`400`):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "name length must be at least 2 characters long",
    "email must be a valid email",
    "Password must be at least 8 characters long",
    "Password must contain at least one letter and one number"
  ]
}
```

## How email verification works

1. On register, the server creates 32 random bytes (the **raw token**), stores only its **SHA-256 hash** plus an expiry time, and emails a link containing the raw token.
2. The user clicks the link. The frontend page `/verify-email` reads `token` from the URL and calls `GET /api/auth/verify-email?token=...`.
3. The server hashes the received token, finds a user with that hash whose expiry is still in the future, sets `isVerified = true`, and deletes the token so the link works only once.
4. Login and `/api/user/profile` both reject unverified accounts.

This token is completely separate from the login JSON Web Token.

## Security design

- **Passwords:** hashed with bcrypt (cost 12) in the model's pre-save hook. The password field is excluded from queries by default.
- **Verification token:** random, time-limited, single use. Only its SHA-256 hash is stored, so a database leak cannot be used to verify accounts.
- **Login token:** signed with HS256 using `JWT_SECRET`, with the algorithm pinned on verification and a configurable expiry.
- **No account probing:** wrong email and wrong password return the same message, and `resend-verification` always returns the same reply.
- **Unverified accounts:** blocked at login and again in the protected-route middleware.
- **Input handling:** every request body and query is validated with Joi, and unknown fields are stripped.

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
    jwt.js                     Sign/verify login tokens
    verificationToken.js       Generate + hash email verification tokens
    sendEmail.js               Nodemailer: sends the verification email
  middleware/
    validate.js                Runs a Joi schema on body/query
    auth.js                    `protect`: token check + verified-only
    errorHandler.js            404 + central error handler
  controllers/
    authController.js          register, verifyEmail, resendVerification, login
    userController.js          getProfile
  routes/
    authRoutes.js              /api/auth/*
    userRoutes.js              /api/user/*
postman_collection.json        Import into Postman to test every endpoint
```

## Testing with Postman

1. Import `postman_collection.json`.
2. Run **Register**, then open your Mailtrap inbox and copy the `token` from the link.
3. Paste it into the collection variable `verifyToken`, then run **Verify Email**.
4. Run **Login**. The collection saves the returned token automatically, so **Get Profile** works right after.

## Notes

- `bcryptjs` is a pure JavaScript bcrypt implementation, so installation works on every operating system without native build tools. It produces standard bcrypt hashes.
- For production: use HTTPS, set a strong `JWT_SECRET`, restrict `FRONTEND_URL` for CORS, and use a real email provider.
