const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { uploadDir } = require('../middleware/upload');
const Pengajuan = require('../models/Pengajuan');
const logger = require('../config/logger');

const ALLOWED_FIELDS = ['fileTranskripNilai', 'fileKrs', 'fileFormulirDosen', 'fileDraftProposal'];

// GET /files/:pengajuanId/:field -> unduh dokumen tertentu
// Hanya bisa diakses oleh mahasiswa pemilik pengajuan atau UPPS
router.get('/:pengajuanId/:field', ensureAuthenticated, async (req, res) => {
  try {
    const { pengajuanId, field } = req.params;

    if (!ALLOWED_FIELDS.includes(field)) {
      return res.status(400).send('Dokumen tidak dikenali.');
    }

    const pengajuan = await Pengajuan.findById(pengajuanId);
    if (!pengajuan) return res.status(404).send('Pengajuan tidak ditemukan.');

    const isOwner = String(pengajuan.mahasiswa) === String(req.user._id);
    const isAdmin = req.user.role === 'upps';
    if (!isOwner && !isAdmin) {
      logger.warn(`Akses dokumen ditolak: user ${req.user.email} mencoba akses ${field} milik pengajuan ${pengajuanId}`);
      return res.status(403).send('Anda tidak memiliki akses ke dokumen ini.');
    }

    const fileMeta = pengajuan[field];
    if (!fileMeta || !fileMeta.storedName) {
      return res.status(404).send('Dokumen tidak ditemukan.');
    }

    const filePath = path.join(uploadDir, fileMeta.storedName);

    // Cek dulu file fisiknya benar-benar ada sebelum coba di-download,
    // supaya kalau hilang (mis. folder uploads pernah terhapus/dipindah) errornya jelas, bukan 500 mentah.
    if (!fs.existsSync(filePath)) {
      logger.error(
        `File fisik tidak ditemukan: pengajuan=${pengajuanId} field=${field} storedName=${fileMeta.storedName} path=${filePath}`
      );
      return res
        .status(404)
        .send(
          'File tidak ditemukan di server. Kemungkinan file sudah terhapus/hilang dari folder uploads. Silakan minta mahasiswa mengunggah ulang dokumen ini.'
        );
    }

    res.download(filePath, fileMeta.originalName, (err) => {
      if (err) {
        logger.error(`Gagal mengirim file ${filePath}: ${err.message}`, { stack: err.stack });
      }
    });
  } catch (err) {
    logger.error(`Error saat mengambil dokumen: ${err.message}`, { stack: err.stack });
    res.status(500).send('Terjadi kesalahan saat mengambil dokumen. Silakan coba lagi.');
  }
});

module.exports = router;
