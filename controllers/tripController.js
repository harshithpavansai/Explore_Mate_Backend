/**
 * Trips: scheduling, AI itinerary, PDF export.
 */
const { query } = require('../config/database');
const { ok, created, ApiError, asyncHandler } = require('../utils/responseHandler');
const pdfService = require('../services/pdfService');
const aiService = require('../services/openaiService');

// GET /trips
const list = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM trips WHERE user_id = $1 ORDER BY start_date DESC NULLS LAST, created_at DESC',
    [req.user.id]
  );
  return ok(res, rows);
});

// GET /trips/:id
const detail = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM trips WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) throw new ApiError('Trip not found', 404);
  return ok(res, rows[0]);
});

// POST /trips
const create = asyncHandler(async (req, res) => {
  const { title, destination, start_date, end_date, budget, travelers, itinerary, notes } = req.body;
  if (!title) throw new ApiError('title required');
  const { rows } = await query(
    `INSERT INTO trips (user_id,title,destination,start_date,end_date,budget,travelers,itinerary,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'[]'::jsonb),$9) RETURNING *`,
    [req.user.id, title, destination || null, start_date || null, end_date || null,
     budget || null, travelers || 1, itinerary ? JSON.stringify(itinerary) : null, notes || null]
  );
  return created(res, rows[0], 'Trip created');
});

// PUT /trips/:id
const update = asyncHandler(async (req, res) => {
  const allowed = ['title','destination','start_date','end_date','budget','travelers','status','itinerary','notes'];
  const updates = []; const values = []; let i = 1;
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      updates.push(`${k} = $${i++}`);
      values.push(k === 'itinerary' ? JSON.stringify(req.body[k]) : req.body[k]);
    }
  }
  if (!updates.length) throw new ApiError('No fields to update');
  values.push(req.params.id, req.user.id);
  const { rows } = await query(
    `UPDATE trips SET ${updates.join(',')} WHERE id = $${i++} AND user_id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) throw new ApiError('Trip not found', 404);
  return ok(res, rows[0], 'Trip updated');
});

// DELETE /trips/:id
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM trips WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rowCount) throw new ApiError('Trip not found', 404);
  return ok(res, null, 'Trip deleted');
});

// POST /trips/:id/generate-itinerary  - AI itinerary
const generateItinerary = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM trips WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  const trip = rows[0];
  if (!trip) throw new ApiError('Trip not found', 404);

  const itinerary = await aiService.generateItinerary({
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    travelers: trip.travelers,
    interests: req.body.interests || [],
    budget: trip.budget,
  });

  await query('UPDATE trips SET itinerary = $1 WHERE id = $2', [JSON.stringify(itinerary), trip.id]);
  return ok(res, itinerary, 'Itinerary generated');
});

// GET /trips/:id/export-pdf  - downloads a PDF
const exportPdf = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT t.*, u.name AS user_name FROM trips t
     JOIN users u ON u.id = t.user_id
     WHERE t.id = $1 AND t.user_id = $2`,
    [req.params.id, req.user.id]
  );
  const trip = rows[0];
  if (!trip) throw new ApiError('Trip not found', 404);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="exploremate-trip-${trip.id}.pdf"`);
  pdfService.streamTripPdf(trip, res);
});

module.exports = { list, detail, create, update, remove, generateItinerary, exportPdf };
