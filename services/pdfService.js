/**
 * PDF generation - trip plan exports.
 * Streams a PDF directly to the response so we don't need temp files.
 */
const PDFDocument = require('pdfkit');

const streamTripPdf = (trip, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  // Header
  doc.font('Helvetica-Bold').fontSize(24).fillColor('#0F4C75').text('ExploreMate Trip Plan', { align: 'center' });
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10).fillColor('#666')
     .text(`Generated for ${trip.user_name || 'Traveler'} on ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  // Summary box
  doc.fillColor('black').fontSize(16).font('Helvetica-Bold').text(trip.title);
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  if (trip.destination) doc.text(`Destination: ${trip.destination}`);
  if (trip.start_date)  doc.text(`Dates: ${formatDate(trip.start_date)}  -  ${formatDate(trip.end_date)}`);
  if (trip.travelers)   doc.text(`Travelers: ${trip.travelers}`);
  if (trip.budget)      doc.text(`Budget: ${trip.budget}`);
  if (trip.status)      doc.text(`Status: ${trip.status}`);

  // Notes
  if (trip.notes) {
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Notes');
    doc.font('Helvetica').text(trip.notes, { align: 'justify' });
  }

  // Itinerary
  const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary :
                    (typeof trip.itinerary === 'string' ? safeJson(trip.itinerary) : []);
  doc.moveDown();
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#0F4C75').text('Itinerary');
  doc.moveDown(0.3).fillColor('black');

  if (!itinerary.length) {
    doc.font('Helvetica-Oblique').fontSize(11).text('No itinerary generated yet.');
  } else {
    itinerary.forEach((day) => {
      doc.font('Helvetica-Bold').fontSize(12)
         .text(`Day ${day.day || ''}${day.date ? ' - ' + formatDate(day.date) : ''}: ${day.title || ''}`);
      doc.font('Helvetica').fontSize(10);
      if (day.morning)   doc.text(`Morning: ${day.morning}`);
      if (day.afternoon) doc.text(`Afternoon: ${day.afternoon}`);
      if (day.evening)   doc.text(`Evening: ${day.evening}`);
      if (Array.isArray(day.highlights) && day.highlights.length) {
        doc.text(`Highlights: ${day.highlights.join(', ')}`);
      }
      if (day.estimated_cost != null) doc.text(`Estimated cost: ${day.estimated_cost}`);
      doc.moveDown();
    });
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(9).fillColor('#888')
     .text('Crafted with ExploreMate - your AI travel companion', { align: 'center' });

  doc.end();
};

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toISOString().slice(0, 10); }
  catch { return String(d); }
}
function safeJson(s) { try { return JSON.parse(s); } catch { return []; } }

module.exports = { streamTripPdf };
