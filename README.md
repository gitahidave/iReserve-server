
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

## M-Pesa payments (Daraja)

Set the Daraja app credentials, API base URL, and a publicly reachable HTTPS callback URL in the server environment:

```env
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_PASSKEY=your-stk-passkey
MPESA_SHORT_CODE=your-business-shortcode
MPESA_CALLBACK_URL=https://your-api.example.com/api/payments/mpesa/callback
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
```

Use `MPESA_BASE_URL=https://api.safaricom.co.ke` with production credentials when going live. The authenticated endpoint `POST /api/payments/mpesa/initialize` accepts `{ "bookingId": "...", "phoneNumber": "0712345678" }` (also accepts `01...` or `254...`) and sends an STK Push. The server uses the saved booking total in KES; Daraja requires an integer amount, so fractional KES values are rounded to the nearest shilling. The callback verifies the checkout request and amount, then queries Daraja before confirming the booking. Collections are made to the configured Daraja shortcode; automatic host payout splitting is not part of this flow.
