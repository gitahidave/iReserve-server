import nodemailer from 'nodemailer';

const sendWithNodemailer = async (options) => {
  const fromEmail = process.env.FROM_EMAIL;
  const host = process.env.SMTP_HOST;
  if (!fromEmail || !host) {
    throw new Error('FROM_EMAIL and SMTP_HOST are required to send email in development');
  }

  const port = Number(process.env.SMTP_PORT || 1025);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a valid port number');
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (Boolean(user) !== Boolean(pass)) {
    throw new Error('SMTP_USER and SMTP_PASS must both be configured when SMTP authentication is used');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    ...(user && pass ? { auth: { user, pass } } : {}),
  });

  const result = await transporter.sendMail({
    from: `"${process.env.FROM_NAME || 'iReserve'}" <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.text || options.message,
    html: options.html,
  });
  console.log('Email sent successfully:', result.messageId);
  return result;
};

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
  if (process.env.NODE_ENV !== 'production') {
    return sendWithNodemailer(options);
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required to send email');
  }

  return sendWithResend(options);
};