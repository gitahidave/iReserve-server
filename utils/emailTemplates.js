const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const getBrandHeader = (title) => {
  const logoUrl = process.env.EMAIL_LOGO_URL?.trim() || 'cid:ireserve-logo';
  const brand = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="iReserve" width="180" style="display: block; width: 180px; max-width: 100%; height: auto; margin: 0 auto 12px; border: 0;">`
    : '<div style="font-size: 28px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 12px;">iReserve</div>';

  return `
    <div style="background-color: #0f172a; padding: 24px 20px; text-align: center; color: #ffffff;">
      ${brand}
      <h1 style="margin: 0; font-size: 24px;">${escapeHtml(title)}</h1>
    </div>
  `;
};

export const getBookingConfirmationTemplate = (booking, user) => {
  const listingTitle = escapeHtml(booking.listingId?.title || 'Workspace');
  const clientName = escapeHtml(user.name);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${getBrandHeader('Workspace Booking Confirmed')}
      <div style="padding: 24px; color: #334155;">
        <p>Hi <strong>${clientName}</strong>,</p>
        <p>Your payment was successful and your reservation is now confirmed!</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0f172a;">Booking Details</h3>
          <p style="margin: 4px 0;"><strong>Booking Ref:</strong> ${escapeHtml(booking._id)}</p>
          <p style="margin: 4px 0;"><strong>Workspace:</strong> ${listingTitle}</p>
          <p style="margin: 4px 0;"><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>End Time:</strong> ${new Date(booking.endTime).toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>Total Paid:</strong> KES ${Number(booking.totalPrice).toLocaleString()}</p>
        </div>

        <p>Thank you for choosing iReserve. If you have any questions, please contact our support team.</p>
      </div>
      <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
        &copy; ${new Date().getFullYear()} iReserve. All rights reserved.
      </div>
    </div>
  `;
};

export const getHostPaymentTemplate = (booking, host) => {
  const hostName = escapeHtml(host.name);
  const listingTitle = escapeHtml(booking.listingId?.title || 'Workspace');
  const clientName = escapeHtml(booking.clientId?.name || 'Client');
  const clientEmail = escapeHtml(booking.clientId?.email || '');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
      ${getBrandHeader('Payment Received')}
      <div style="padding: 24px;">
        <p>Hi <strong>${hostName}</strong>,</p>
        <p>Payment was received for a booking on <strong>${listingTitle}</strong>.</p>
        <p><strong>Booking Ref:</strong> ${escapeHtml(booking._id)}<br>
        <strong>Start:</strong> ${new Date(booking.startTime).toLocaleString()}<br>
        <strong>End:</strong> ${new Date(booking.endTime).toLocaleString()}<br>
        <strong>Amount:</strong> KES ${Number(booking.totalPrice).toLocaleString()}<br>
        <strong>Client:</strong> ${clientName} (${clientEmail})</p>
      </div>
    </div>
  `;
};

export const getWelcomeEmailTemplate = (user) => {
  const userName = escapeHtml(user.name || 'there');
  const roleLabel = user.role === 'host' ? 'Host' : 'Client';
  const roleMessage =
    user.role === 'host'
      ? 'You can now start listing your spaces and manage bookings from your dashboard.'
      : 'You can now browse listings, book spaces, and manage your reservations from your dashboard.';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${getBrandHeader('Welcome to iReserve')}
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Welcome to iReserve. Your ${roleLabel.toLowerCase()} account has been created successfully.</p>
        <p>${roleMessage}</p>
        <p>Use your email and password to sign in whenever you are ready.</p>
        <p>Thanks for joining iReserve.</p>
      </div>
      <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
        &copy; ${new Date().getFullYear()} iReserve. All rights reserved.
      </div>
    </div>
  `;
};