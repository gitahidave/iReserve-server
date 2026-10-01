import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
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