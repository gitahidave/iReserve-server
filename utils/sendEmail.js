import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  if (!process.env.SMTP_HOST || !process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP email configuration is incomplete');
  }

  // Create reusable transporter object using SMTP transport
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const message = {
    from: `"${process.env.FROM_NAME || 'iReserve'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.text || options.message,
    html: options.html,
    attachments: options.attachments || [],
  };

  const info = await transporter.sendMail(message);

  console.log('Email sent: %s', info.messageId);
  return info;
};