const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || '').trim().toLowerCase();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = (profile.emails && profile.emails[0].value || '').toLowerCase();
        const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : '';

        // Email di ADMIN_EMAILS dikecualikan dari pembatasan domain,
        // supaya admin tetap bisa login pakai Gmail biasa meski mahasiswa dibatasi ke domain kampus.
        if (ALLOWED_DOMAIN && !ADMIN_EMAILS.includes(email) && !email.endsWith('@' + ALLOWED_DOMAIN)) {
          return done(null, false, { message: `Login hanya diizinkan untuk email @${ALLOWED_DOMAIN}` });
        }

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Jika email cocok dengan daftar ADMIN_EMAILS -> role upps, selain itu mahasiswa
          const role = ADMIN_EMAILS.includes(email) ? 'upps' : 'mahasiswa';
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
            avatar,
            role,
          });
        } else {
          // sinkronkan data profil terbaru
          user.name = profile.displayName;
          user.avatar = avatar;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
