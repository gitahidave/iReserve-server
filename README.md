# iReserve-server
This is the backend server for the iReserve Booking System.
It is built using Node.js, Express, and MongoDB. The server provides RESTful APIs for managing reservations, users, and payments.

## Payment Emails

Successful Paystack payments dispatch confirmation emails to the client and listing host. Configure these environment variables before enabling email delivery:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_EMAIL=your-sender@gmail.com
SMTP_PASSWORD=your-gmail-app-password
FROM_NAME=iReserve
FROM_EMAIL=your-sender@gmail.com
EMAIL_LOGO_URL=https://your-domain.com/assets/ireserve-logo.png
```

For Gmail, use an App Password rather than the normal account password. `EMAIL_LOGO_URL` should be a publicly reachable HTTPS PNG or JPG URL because email clients block local server files. If it is omitted, emails use the text-based iReserve wordmark. Email dispatch failures are logged and do not cause Paystack webhook retries; a later webhook delivery can retry until both emails are sent.