const fs = require('fs');
const path = require('path');
const winston = require('winston');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => `[${ts}] ${level}: ${stack || message}`)
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    // Semua log level >= info masuk ke file gabungan
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    // Khusus error masuk ke file terpisah supaya mudah dipantau
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
  ],
});

// Di luar production, tampilkan juga ke console dengan format yang lebih enak dibaca
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
} else {
  logger.add(new winston.transports.Console({ format: combine(timestamp(), json()) }));
}

// Stream supaya morgan bisa menulis log HTTP request ke winston (dan otomatis ke file)
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
