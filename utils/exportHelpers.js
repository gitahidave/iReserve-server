import PDFDocument from 'pdfkit';
import { json2csv } from 'json-2-csv';

// Generate PDF Invoice for a Booking
export const generateBookingPDF = (booking, res) => {
  const doc = new PDFDocument({ margin: 50 });

  // Stream PDF directly to HTTP Response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=invoice-${booking._id}.pdf`
  );

  doc.pipe(res);

  // Header
  doc
    .fillColor('#0f172a')
    .fontSize(24)
    .text('iReserve Workspace Receipt', { align: 'center' });
  doc.moveDown();

  // Invoice Details
  doc.fontSize(12).text(`Booking Reference: ${booking._id}`);
  doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString()}`);
  doc.text(`Payment Status: ${booking.bookingStatus.toUpperCase()}`);
  doc.moveDown();

  // Divider Line
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#cbd5e1');
  doc.moveDown();

  // Venue & Customer Details
  doc.fontSize(14).text('Booking Details', { underline: true });
  doc.fontSize(12).text(`Workspace: ${booking.listingId?.title || 'N/A'}`);
  doc.text(`Address: ${booking.listingId?.location?.address || 'N/A'}`);
  doc.text(`Client: ${booking.clientId?.name || 'N/A'} (${booking.clientId?.email || 'N/A'})`);
  doc.moveDown();

  // Timing & Billing
  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(12).text(`Start Time: ${new Date(booking.startTime).toLocaleString()}`);
  doc.text(`End Time: ${new Date(booking.endTime).toLocaleString()}`);
  doc.text(`Total Paid: KES ${booking.totalPrice.toLocaleString()}`);

  doc.moveDown(2);
  doc
    .fontSize(10)
    .fillColor('#64748b')
    .text('Thank you for choosing iReserve!', { align: 'center' });

  doc.end();
};

// Generate CSV Report for Host Earnings or Client Bookings
export const generateCSVReport = (data) => {
  const formattedData = data.map((item) => ({
    'Booking ID': item._id,
    'Workspace Title': item.listingId?.title || 'N/A',
    'Category': item.listingId?.category || 'N/A',
    'Client Name': item.clientId?.name || 'N/A',
    'Client Email': item.clientId?.email || 'N/A',
    'Start Time': new Date(item.startTime).toLocaleString(),
    'End Time': new Date(item.endTime).toLocaleString(),
    'Amount (KES)': item.totalPrice,
    'Status': item.bookingStatus,
  }));

  return json2csv(formattedData);
};