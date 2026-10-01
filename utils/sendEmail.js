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
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required to send email');
  }

  return sendWithResend(options);
};