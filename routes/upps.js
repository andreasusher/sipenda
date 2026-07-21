const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const { ensureRole } = require('../middleware/auth');
const { dosenRules } = require('../middleware/validate');
const { getFileStatus } = require('../middleware/fileStatus');
const Dosen = require('../models/Dosen');
const Pengajuan = require('../models/Pengajuan');
const logger = require('../config/logger');

router.use(ensureRole('upps'));

// Dashboard: ringkasan & daftar semua pengajuan
router.get('/dashboard', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const pengajuanList = await Pengajuan.find(filter)
    .populate('mahasiswa dosenDitetapkan')
    .sort({ createdAt: -1 });

  const summary = {
    total: await Pengajuan.countDocuments(),
    pending: await Pengajuan.countDocuments({ status: 'pending' }),
    diproses: await Pengajuan.countDocuments({ status: 'diproses' }),
    disetujui: await Pengajuan.countDocuments({ status: 'disetujui' }),
    ditolak: await Pengajuan.countDocuments({ status: 'ditolak' }),
  };

  res.render('upps/dashboard', {
    title: 'Dashboard UPPS',
    pengajuanList,
    summary,
    statusFilter: req.query.status || '',
    active: 'dashboard',
  });
});

// Halaman pencarian: cari pengajuan berdasarkan nama/NIM/prodi/status
router.get('/pencarian', async (req, res) => {
  const q = (req.query.q || '').trim();
  const statusFilter = req.query.status || '';
  const prodiFilter = req.query.prodi || '';

  const filter = {};
  if (statusFilter) filter.status = statusFilter;
  if (prodiFilter) filter.prodi = prodiFilter;
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ namaLengkap: regex }, { nim: regex }];
  }

  // Hanya jalankan query jika user sudah memasukkan minimal satu kriteria pencarian,
  // supaya halaman tidak langsung menampilkan seluruh data saat pertama dibuka.
  const hasCriteria = Boolean(q || statusFilter || prodiFilter);
  const results = hasCriteria
    ? await Pengajuan.find(filter).populate('mahasiswa dosenDitetapkan').sort({ createdAt: -1 })
    : [];

  res.render('upps/pencarian', {
    title: 'Pencarian Pengajuan',
    results,
    q,
    statusFilter,
    prodiFilter,
    hasCriteria,
    active: 'pencarian',
  });
});

// Detail & proses pengajuan
router.get('/pengajuan/:id', async (req, res) => {
  const pengajuan = await Pengajuan.findById(req.params.id).populate('mahasiswa dosenDitetapkan');
  if (!pengajuan) {
    req.flash('error', 'Pengajuan tidak ditemukan.');
    return res.redirect('/upps/dashboard');
  }
  const dosenList = await Dosen.find({ aktif: true }).sort({ nama: 1 });
  const status = getFileStatus(pengajuan);
  res.render('upps/detail', { title: 'Proses Pengajuan', pengajuan, dosenList, status, active: 'dashboard' });
});

router.post('/pengajuan/:id/proses', async (req, res) => {
  try {
    const { keputusan, dosenDitetapkan, catatanAdmin } = req.body;
    const pengajuan = await Pengajuan.findById(req.params.id);
    if (!pengajuan) {
      req.flash('error', 'Pengajuan tidak ditemukan.');
      return res.redirect('/upps/dashboard');
    }

    if (keputusan === 'setujui') {
      if (!dosenDitetapkan) {
        req.flash('error', 'Pilih dosen yang ditetapkan sebelum menyetujui.');
        return res.redirect(`/upps/pengajuan/${pengajuan._id}`);
      }
      pengajuan.status = 'disetujui';
      pengajuan.dosenDitetapkan = dosenDitetapkan;
      await Dosen.findByIdAndUpdate(dosenDitetapkan, { $inc: { jumlahBimbinganAktif: 1 } });
    } else if (keputusan === 'tolak') {
      pengajuan.status = 'ditolak';
    } else {
      pengajuan.status = 'diproses';
    }

    pengajuan.catatanAdmin = catatanAdmin || '';
    pengajuan.diprosesOleh = req.user._id;
    pengajuan.tanggalDiproses = new Date();
    await pengajuan.save();

    logger.info(`Pengajuan ${pengajuan._id} diproses oleh ${req.user.email} -> status: ${pengajuan.status}`);
    req.flash('success', 'Status pengajuan berhasil diperbarui.');
    res.redirect('/upps/dashboard');
  } catch (err) {
    logger.error(`Gagal memproses pengajuan ${req.params.id} - ${err.message}`, { stack: err.stack });
    req.flash('error', 'Terjadi kesalahan saat memproses pengajuan.');
    res.redirect('/upps/dashboard');
  }
});

// --- Master data dosen ---
router.get('/dosen', async (req, res) => {
  const dosenList = await Dosen.find().sort({ nama: 1 });
  res.render('upps/dosen', { title: 'Master Data Dosen', dosenList, active: 'dosen', editingDosen: null });
});

router.post('/dosen', dosenRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array({ onlyFirstError: true }).map((e) => e.msg).join(' '));
    return res.redirect('/upps/dosen');
  }

  try {
    const { nama, nidn, bidangKeahlian, email, kuotaBimbingan } = req.body;
    await Dosen.create({ nama, nidn, bidangKeahlian, email, kuotaBimbingan: kuotaBimbingan || 10 });
    logger.info(`Dosen baru ditambahkan: ${nama} (NIDN ${nidn}) oleh ${req.user.email}`);
    req.flash('success', 'Dosen berhasil ditambahkan.');
  } catch (err) {
    logger.error(`Gagal menambahkan dosen - ${err.message}`);
    req.flash('error', 'Gagal menambahkan dosen (NIDN mungkin sudah terdaftar).');
  }
  res.redirect('/upps/dosen');
});

// Form edit dosen (tampil di halaman yang sama dengan mode edit aktif)
router.get('/dosen/:id/edit', async (req, res) => {
  const editingDosen = await Dosen.findById(req.params.id);
  if (!editingDosen) {
    req.flash('error', 'Dosen tidak ditemukan.');
    return res.redirect('/upps/dosen');
  }
  const dosenList = await Dosen.find().sort({ nama: 1 });
  res.render('upps/dosen', { title: 'Master Data Dosen', dosenList, active: 'dosen', editingDosen });
});

router.post('/dosen/:id/edit', dosenRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array({ onlyFirstError: true }).map((e) => e.msg).join(' '));
    return res.redirect(`/upps/dosen/${req.params.id}/edit`);
  }

  try {
    const { nama, nidn, bidangKeahlian, email, kuotaBimbingan } = req.body;
    const dosen = await Dosen.findById(req.params.id);
    if (!dosen) {
      req.flash('error', 'Dosen tidak ditemukan.');
      return res.redirect('/upps/dosen');
    }
    dosen.nama = nama;
    dosen.nidn = nidn;
    dosen.bidangKeahlian = bidangKeahlian;
    dosen.email = email || '';
    dosen.kuotaBimbingan = kuotaBimbingan || dosen.kuotaBimbingan;
    await dosen.save();

    logger.info(`Dosen ${dosen._id} diperbarui oleh ${req.user.email}`);
    req.flash('success', 'Data dosen berhasil diperbarui.');
    res.redirect('/upps/dosen');
  } catch (err) {
    logger.error(`Gagal memperbarui dosen ${req.params.id} - ${err.message}`);
    req.flash('error', 'Gagal memperbarui data dosen (NIDN mungkin sudah dipakai dosen lain).');
    res.redirect(`/upps/dosen/${req.params.id}/edit`);
  }
});

router.post('/dosen/:id/toggle', async (req, res) => {
  const dosen = await Dosen.findById(req.params.id);
  if (dosen) {
    dosen.aktif = !dosen.aktif;
    await dosen.save();
  }
  res.redirect('/upps/dosen');
});

router.post('/dosen/:id/delete', async (req, res) => {
  await Dosen.findByIdAndDelete(req.params.id);
  logger.info(`Dosen ${req.params.id} dihapus oleh ${req.user.email}`);
  req.flash('success', 'Dosen berhasil dihapus.');
  res.redirect('/upps/dosen');
});

module.exports = router;
