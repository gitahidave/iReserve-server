import nodemailer from 'nodemailer';

const sendWithResend = async (options) => {
  const fromEmail = process.env.FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('FROM_EMAIL is required when RESEND_API_KEY is configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `"${process.env.FROM_NAME || 'iReserve'}" <${fromEmail}>`,
      to: [options.email],
      subject: options.subject,
      text: options.text || options.message,
      html: options.html,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend API error (${response.status}): ${result.message || response.statusText}`);
  }

  console.log('Email sent successfully:', result.id);
  return result;
};

export const sendEmail = async (options) => {
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(options);
  }

  if (process.env.VERCEL === '1') {
    throw new Error('Configure RESEND_API_KEY and FROM_EMAIL to send email from Vercel');
  }

  const smtpPort = Number(process.env.SMTP_PORT || 587);

  if (!process.env.SMTP_HOST || !process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP email configuration is incomplete');
  }

  // Gmail-specific connection settings optimized for Render cloud instances
  const isGmail = process.env.SMTP_HOST.includes('gmail.com');

  const transporter = nodemailer.createTransport(
    isGmail
      ? {
          service: 'gmail', // Uses Nodemailer's built-in Gmail preset (handles TLS handshakes better on cloud hosts)
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {
          host: process.env.SMTP_HOST,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
          // Prevents connection timeouts on cloud hosting providers like Render
          tls: {
            rejectUnauthorized: true,
            ciphers: 'SSLv3',
          },
        }
  );

  const message = {
    from: `"${process.env.FROM_NAME || 'iReserve'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.text || options.message,
    html: options.html,
    attachments: options.attachments || [],
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('✅ Email sent successfully: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Nodemailer Error sending email:', error.message);
    throw error; // Re-throw to be caught by your route handler/controller
  }
};