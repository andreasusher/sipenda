require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const connectDB = require('./config/db');
const logger = require('./config/logger');
const { ensureAuthenticated } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const mahasiswaRoutes = require('./routes/mahasiswa');
const uppsRoutes = require('./routes/upps');
const filesRoutes = require('./routes/files');

const app = express();

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Log ke console dengan format ringkas saat development,
// dan selalu tulis log request ke file lewat winston (config/logger.js)
app.use(morgan('dev'));
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 hari
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Variabel global untuk semua view
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use('/', authRoutes);
app.use('/mahasiswa', mahasiswaRoutes);
app.use('/upps', uppsRoutes);
app.use('/files', filesRoutes);

app.get('/', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login');
  return res.redirect(req.user.role === 'upps' ? '/upps/dashboard' : '/mahasiswa/dashboard');
});

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Halaman Tidak Ditemukan' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });
  res.status(500).render('500', { title: 'Kesalahan Server' });
});

// Tangkap error yang tidak tertangani supaya tetap tercatat sebelum proses berhenti
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason instanceof Error ? reason.stack : reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack || err.message}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server berjalan di port ${PORT}`));
