/**
 * Winston-based application logger.
 * Falls back to console if winston isn't available.
 */
let logger;
try {
  const winston = require('winston');
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack }) =>
        `${timestamp} [${level.toUpperCase()}] ${stack || message}`
      )
    ),
    transports: [new winston.transports.Console()],
  });
} catch {
  // Fallback if winston isn't installed yet
  logger = {
    info:  (m) => console.log(`[INFO] ${m}`),
    warn:  (m) => console.warn(`[WARN] ${m}`),
    error: (m) => console.error(`[ERROR] ${m}`),
    debug: (m) => console.debug(`[DEBUG] ${m}`),
  };
}

module.exports = logger;
