const path = require('path');
const fs = require('fs');
const { uploadDir } = require('./upload');

const DOKUMEN_FIELDS = ['fileTranskripNilai', 'fileKrs', 'fileFormulirDosen', 'fileDraftProposal'];

// Mengecek untuk tiap field dokumen pada sebuah pengajuan, apakah file fisiknya
// masih ada di folder uploads. Dipakai supaya mahasiswa/UPPS tahu dokumen mana
// yang hilang sebelum mencoba membukanya (menghindari error 500/404 mendadak).
function getFileStatus(pengajuan) {
  const status = {};
  DOKUMEN_FIELDS.forEach((f) => {
    const meta = pengajuan[f];
    const filePath = meta && meta.storedName ? path.join(uploadDir, meta.storedName) : null;
    status[f] = {
      originalName: meta ? meta.originalName : null,
      ada: Boolean(filePath && fs.existsSync(filePath)),
    };
  });
  return status;
}

module.exports = { getFileStatus, DOKUMEN_FIELDS };
