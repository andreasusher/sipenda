function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash('error', 'Silakan login terlebih dahulu.');
  return res.redirect('/login');
}

function ensureRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      req.flash('error', 'Silakan login terlebih dahulu.');
      return res.redirect('/login');
    }
    if (!roles.includes(req.user.role)) {
      req.flash('error', 'Anda tidak memiliki akses ke halaman tersebut.');
      return res.redirect('/');
    }
    return next();
  };
}

module.exports = { ensureAuthenticated, ensureRole };
