
# Password reset and email configuration

The authentication API provides:

- `POST /api/auth/forgot-password` with `{ "email": "..." }`. It sends a one-hour reset link and returns the same response whether or not the account exists.
- `POST /api/auth/reset-password` with `{ "token": "...", "password": "..." }`. The link opens `/reset-password?token=...` on the client; submit that token with the new password.

Set `CLIENT_URL` to the client origin so reset links point to the deployed client. For a custom reset page URL, set `PASSWORD_RESET_URL`.

In development (`NODE_ENV=development`), email is sent through Nodemailer using SMTP:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
FROM_EMAIL=no-reply@example.com
FROM_NAME=iReserve
```

Configure `SMTP_USER` and `SMTP_PASS` together when the SMTP server requires authentication. A local SMTP inbox such as Mailpit can receive development emails. In other environments, email continues to use Resend with `RESEND_API_KEY` and `FROM_EMAIL`.
