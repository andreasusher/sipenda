const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect(req.user.role === 'upps' ? '/upps/dashboard' : '/mahasiswa/dashboard');
  }
  res.render('login', { title: 'Masuk' });
});

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
  (req, res) => {
    const dest = req.user.role === 'upps' ? '/upps/dashboard' : '/mahasiswa/dashboard';
    res.redirect(dest);
  }
);

router.post('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

module.exports = router;
