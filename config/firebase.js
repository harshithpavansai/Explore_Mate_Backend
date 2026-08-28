/**
 * Firebase Admin SDK initialization.
 * Used for OTP/phone authentication verification and ID-token validation.
 *
 * Configuration sources (in priority order):
 *   1. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars
 *   2. GOOGLE_APPLICATION_CREDENTIALS file path
 *   3. Application Default Credentials
 */
const admin = require('firebase-admin');
const logger = require('../utils/logger');

let initialized = false;

const initFirebase = () => {
  if (initialized || admin.apps.length) {
    initialized = true;
    return admin;
  }

  try {
    const path = require('path');
    const fs = require('fs');
    const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else {
      logger.warn('Firebase Admin not configured - OTP/phone verification will be disabled.');
      return null;
    }
    initialized = true;
    logger.info('Firebase Admin initialized successfully');
    return admin;
  } catch (err) {
    logger.error(`Firebase Admin init failed: ${err.message}`);
    return null;
  }
};

const firebaseAdmin = initFirebase();

/**
 * Verify a Firebase ID token (e.g. from frontend phone OTP flow).
 * Returns the decoded token (uid, phone_number, email, ...) or null if invalid / not configured.
 */
const verifyIdToken = async (idToken) => {
  if (!firebaseAdmin) return null;
  try {
    return await firebaseAdmin.auth().verifyIdToken(idToken);
  } catch (err) {
    logger.warn(`Firebase token verification failed: ${err.message}`);
    return null;
  }
};

module.exports = { firebaseAdmin, verifyIdToken };
