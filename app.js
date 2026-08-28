/**
 * Express application factory.
 * Wires middleware, routes, and error handling.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { ok } = require('./utils/responseHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const tripRoutes = require('./routes/tripRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const aiRoutes = require('./routes/aiRoutes');
const audioTourRoutes = require('./routes/audioTourRoutes');
const translatorRoutes = require('./routes/translatorRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const foodRoutes = require('./routes/foodRoutes');
const hiddenGemsRoutes = require('./routes/hiddenGemsRoutes');
const gameRoutes = require('./routes/gameRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const locationRoutes = require('./routes/locationRoutes');
const freeRoutes = require('./routes/freeRoutes');


const app = express();

// --- Core middleware ---
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);

const API = process.env.API_PREFIX || '/api/v1';

// --- Health check ---
app.get('/', (_req, res) =>
  ok(res, {
    name: 'ExploreMate API',
    version: '1.0.0',
    status: 'running',
    docs: `${API}/health`,
  })
);

app.get(`${API}/health`, (_req, res) =>
  ok(res, { status: 'healthy', timestamp: new Date().toISOString() })
);

// --- Feature routes ---
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/destinations`, destinationRoutes);
app.use(`${API}/trips`, tripRoutes);
app.use(`${API}/favorites`, favoriteRoutes);
app.use(`${API}/reviews`, reviewRoutes);
app.use(`${API}/ai`, aiRoutes);
app.use(`${API}/audio-tour`, audioTourRoutes);
app.use(`${API}/translator`, translatorRoutes);
app.use(`${API}/weather`, weatherRoutes);
app.use(`${API}/food`, foodRoutes);
app.use(`${API}/hidden-gems`, hiddenGemsRoutes);
app.use(`${API}/game`, gameRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/location`, locationRoutes);
app.use(`${API}/free`, freeRoutes);


// --- Error handling ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
