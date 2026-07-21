const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { validationResult } = require('express-validator');
const { ensureRole } = require('../middleware/auth');
const { pengajuanUploadFields, uploadDir } = require('../middleware/upload');
const { pengajuanRules } = require('../middleware/validate');
const { getFileStatus } = require('../middleware/fileStatus');
const Pengajuan = require('../models/Pengajuan');
const Dosen = require('../models/Dosen');
const logger = require('../config/logger');

router.use(ensureRole('mahasiswa'));

// Dashboard: daftar & riwayat pengajuan milik mahasiswa yang login
// Mendukung pencarian sederhana lewat query ?q= (cari di nama/NIM) dan ?status=
router.get('/dashboard', async (req, res) => {
  const q = (req.query.q || '').trim();
  const statusFilter = req.query.status || '';

  const filter = { mahasiswa: req.user._id };
  if (statusFilter) filter.status = statusFilter;
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ namaLengkap: regex }, { nim: regex }, { prodi: regex }];
  }

  const pengajuanList = await Pengajuan.find(filter)
    .populate('dosenDitetapkan')
    .sort({ createdAt: -1 });

  res.render('mahasiswa/dashboard', {
    title: 'Dashboard Mahasiswa',
    pengajuanList,
    q,
    statusFilter,
    active: 'dashboard',
  });
});

// Form pengajuan baru
router.get('/pengajuan/baru', async (req, res) => {
  const adaPengajuanAktif = await Pengajuan.findOne({
    mahasiswa: req.user._id,
    status: { $in: ['pending', 'diproses', 'disetujui'] },
  });
  if (adaPengajuanAktif) {
    req.flash('error', 'Anda sudah memiliki pengajuan aktif. Tidak bisa mengajukan lagi.');
    return res.redirect('/mahasiswa/dashboard');
  }

  res.render('mahasiswa/form', {
    title: 'Ajukan Dosen Pembimbing',
    active: 'baru',
  });
});

// Halaman pencarian dosen (bantu mahasiswa cek dosen aktif sebelum mengajukan)
router.get('/cari-dosen', async (req, res) => {
  const q = (req.query.q || '').trim();
  const filter = { aktif: true };
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ nama: regex }, { bidangKeahlian: regex }, { nidn: regex }];
  }

  const dosenList = await Dosen.find(filter).sort({ nama: 1 });

  res.render('mahasiswa/cari-dosen', {
    title: 'Cari Dosen Pembimbing',
    dosenList,
    q,
    active: 'cari-dosen',
  });
});

// Simpan pengajuan baru (multipart/form-data karena ada file)
router.post('/pengajuan', (req, res) => {
  pengajuanUploadFields(req, res, async (err) => {
    if (err) {
      req.flash('error', err.message || 'Gagal mengunggah file. Periksa kembali tipe dan ukuran file (maks 10MB).');
      return res.redirect('/mahasiswa/pengajuan/baru');
    }

    try {
      // Validasi data teks (dijalankan manual karena berada di dalam callback multer)
      await Promise.all(pengajuanRules.map((rule) => rule.run(req)));
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array({ onlyFirstError: true }).map((e) => e.msg).join(' '));
        return res.redirect('/mahasiswa/pengajuan/baru');
      }

      const {
        namaLengkap,
        nim,
        prodi,
        konfirmasiTranskrip,
        jumlahSksLulus,
        jumlahSksDiampu,
      } = req.body;

      const files = req.files || {};
      const required = ['fileTranskripNilai', 'fileKrs', 'fileFormulirDosen', 'fileDraftProposal'];
      const missing = required.filter((f) => !files[f]);
      if (missing.length) {
        req.flash('error', 'Semua dokumen wajib diunggah.');
        return res.redirect('/mahasiswa/pengajuan/baru');
      }

      const toFileMeta = (f) => ({
        originalName: f.originalname,
        storedName: f.filename,
        mimetype: f.mimetype,
        size: f.size,
      });

      await Pengajuan.create({
        mahasiswa: req.user._id,
        namaLengkap,
        nim,
        prodi,
        konfirmasiTranskrip: konfirmasiTranskrip === 'on',
        jumlahSksLulus,
        jumlahSksDiampu,
        fileTranskripNilai: toFileMeta(files.fileTranskripNilai[0]),
        fileKrs: toFileMeta(files.fileKrs[0]),
        fileFormulirDosen: toFileMeta(files.fileFormulirDosen[0]),
        fileDraftProposal: toFileMeta(files.fileDraftProposal[0]),
      });

      logger.info(`Pengajuan baru dibuat oleh mahasiswa ${req.user.email} (NIM ${nim})`);
      req.flash('success', 'Pengajuan berhasil dikirim. Silakan pantau statusnya di dashboard.');
      res.redirect('/mahasiswa/dashboard');
    } catch (e) {
      logger.error(`Gagal menyimpan pengajuan - ${e.message}`, { stack: e.stack });
      req.flash('error', 'Terjadi kesalahan saat menyimpan pengajuan.');
      res.redirect('/mahasiswa/pengajuan/baru');
    }
  });
});

// Detail pengajuan
router.get('/pengajuan/:id', async (req, res) => {
  const pengajuan = await Pengajuan.findOne({
    _id: req.params.id,
    mahasiswa: req.user._id,
  }).populate('dosenDitetapkan');

  if (!pengajuan) {
    req.flash('error', 'Pengajuan tidak ditemukan.');
    return res.redirect('/mahasiswa/dashboard');
  }

  const status = getFileStatus(pengajuan);
  res.render('mahasiswa/detail', { title: 'Detail Pengajuan', pengajuan, status, active: 'dashboard' });
});

// Halaman upload ulang dokumen (mis. jika file hilang/rusak di server,
// atau mahasiswa salah unggah dan ingin mengganti salah satu dokumen).
router.get('/pengajuan/:id/dokumen', async (req, res) => {
  const pengajuan = await Pengajuan.findOne({
    _id: req.params.id,
    mahasiswa: req.user._id,
  });

  if (!pengajuan) {
    req.flash('error', 'Pengajuan tidak ditemukan.');
    return res.redirect('/mahasiswa/dashboard');
  }

  const status = getFileStatus(pengajuan);

  res.render('mahasiswa/dokumen', {
    title: 'Upload Ulang Dokumen',
    pengajuan,
    status,
    active: 'dashboard',
  });
});

router.post('/pengajuan/:id/dokumen', (req, res) => {
  pengajuanUploadFields(req, res, async (err) => {
    if (err) {
      req.flash('error', err.message || 'Gagal mengunggah file. Periksa kembali tipe dan ukuran file (maks 10MB).');
      return res.redirect(`/mahasiswa/pengajuan/${req.params.id}/dokumen`);
    }

    try {
      const pengajuan = await Pengajuan.findOne({
        _id: req.params.id,
        mahasiswa: req.user._id,
      });

      if (!pengajuan) {
        req.flash('error', 'Pengajuan tidak ditemukan.');
        return res.redirect('/mahasiswa/dashboard');
      }

      const files = req.files || {};
      const fields = ['fileTranskripNilai', 'fileKrs', 'fileFormulirDosen', 'fileDraftProposal'];
      const toFileMeta = (f) => ({
        originalName: f.originalname,
        storedName: f.filename,
        mimetype: f.mimetype,
        size: f.size,
      });

      let adaYangDiganti = false;
      fields.forEach((f) => {
        if (files[f] && files[f][0]) {
          // Hapus file lama secara fisik (kalau masih ada) supaya tidak menumpuk file sampah.
          const lama = pengajuan[f];
          if (lama && lama.storedName) {
            const pathLama = path.join(uploadDir, lama.storedName);
            fs.unlink(pathLama, () => {}); // abaikan error jika file lama memang sudah tidak ada
          }
          pengajuan[f] = toFileMeta(files[f][0]);
          adaYangDiganti = true;
        }
      });

      if (!adaYangDiganti) {
        req.flash('error', 'Pilih minimal satu file untuk diunggah ulang.');
        return res.redirect(`/mahasiswa/pengajuan/${pengajuan._id}/dokumen`);
      }

      await pengajuan.save();
      logger.info(`Dokumen pengajuan ${pengajuan._id} diperbarui oleh mahasiswa ${req.user.email}`);
      req.flash('success', 'Dokumen berhasil diunggah ulang.');
      res.redirect(`/mahasiswa/pengajuan/${pengajuan._id}`);
    } catch (e) {
      logger.error(`Gagal mengunggah ulang dokumen pengajuan ${req.params.id} - ${e.message}`, { stack: e.stack });
      req.flash('error', 'Terjadi kesalahan saat mengunggah ulang dokumen.');
      res.redirect(`/mahasiswa/pengajuan/${req.params.id}/dokumen`);
    }
  });
});

module.exports = router;
