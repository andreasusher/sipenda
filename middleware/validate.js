const { body, validationResult } = require('express-validator');

// Jalankan setelah rules dari express-validator; kalau ada error,
// simpan pesan ke flash lalu redirect balik ke halaman asal (redirectTo).
function handleValidation(redirectTo) {
  return (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const messages = result.array({ onlyFirstError: true }).map((e) => e.msg);
    req.flash('error', messages.join(' '));
    const target = typeof redirectTo === 'function' ? redirectTo(req) : redirectTo;
    return res.redirect(target);
  };
}

// Aturan validasi untuk form pengajuan dosen pembimbing (mahasiswa)
const pengajuanRules = [
  body('namaLengkap')
    .trim()
    .notEmpty().withMessage('Nama lengkap wajib diisi.')
    .isLength({ min: 3, max: 100 }).withMessage('Nama lengkap harus 3-100 karakter.'),

  body('nim')
    .trim()
    .notEmpty().withMessage('NIM wajib diisi.')
    .isNumeric().withMessage('NIM harus berupa angka.')
    .isLength({ min: 6, max: 15 }).withMessage('NIM harus 6-15 digit.'),

  body('prodi')
    .notEmpty().withMessage('Program studi wajib dipilih.')
    .isIn(['Desain Komunikasi Visual', 'Teknik Informatika', 'Desain Produk'])
    .withMessage('Program studi tidak valid.'),

  body('konfirmasiTranskrip')
    .equals('on').withMessage('Anda harus mengonfirmasi pemeriksaan transkrip dengan Dosen PA.'),

  body('jumlahSksLulus')
    .trim()
    .notEmpty().withMessage('Jumlah SKS lulus wajib diisi.')
    .isInt({ min: 0, max: 200 }).withMessage('Jumlah SKS lulus harus berupa angka 0-200.'),

  body('jumlahSksDiampu')
    .trim()
    .notEmpty().withMessage('Jumlah SKS yang diampu wajib diisi.')
    .isInt({ min: 0, max: 30 }).withMessage('Jumlah SKS yang diampu harus berupa angka 0-30.'),
];

// Aturan validasi untuk form tambah/edit data dosen (UPPS)
const dosenRules = [
  body('nama')
    .trim()
    .notEmpty().withMessage('Nama dosen wajib diisi.')
    .isLength({ min: 3, max: 100 }).withMessage('Nama dosen harus 3-100 karakter.'),

  body('nidn')
    .trim()
    .notEmpty().withMessage('NIDN wajib diisi.')
    .isNumeric().withMessage('NIDN harus berupa angka.')
    .isLength({ min: 8, max: 15 }).withMessage('NIDN harus 8-15 digit.'),

  body('bidangKeahlian')
    .trim()
    .notEmpty().withMessage('Bidang keahlian wajib diisi.')
    .isLength({ min: 3, max: 150 }).withMessage('Bidang keahlian harus 3-150 karakter.'),

  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Format email dosen tidak valid.')
    .normalizeEmail(),

  body('kuotaBimbingan')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 50 }).withMessage('Kuota bimbingan harus berupa angka 1-50.'),
];

module.exports = { handleValidation, pengajuanRules, dosenRules };
