const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`[MongoDB] Terhubung: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`[MongoDB] Gagal terhubung: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

module.exports = connectDB;
