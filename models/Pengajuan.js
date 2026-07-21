const mongoose = require('mongoose');

// Sub-skema untuk setiap dokumen yang diupload mahasiswa
const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true }, // nama file fisik di folder /uploads
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const pengajuanSchema = new mongoose.Schema(
  {
    mahasiswa: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Data diri (sesuai form pengajuan)
    namaLengkap: { type: String, required: true },
    nim: { type: String, required: true },
    prodi: {
      type: String,
      enum: ['Desain Komunikasi Visual', 'Teknik Informatika', 'Desain Produk'],
      required: true,
    },

    konfirmasiTranskrip: { type: Boolean, required: true }, // "Saya telah melakukan pemeriksaan transkrip dengan dosen PA..."
    jumlahSksLulus: { type: Number, required: true },
    jumlahSksDiampu: { type: Number, required: true },

    // Dokumen upload
    fileTranskripNilai: { type: fileSchema, required: true },
    fileKrs: { type: fileSchema, required: true },
    fileFormulirDosen: { type: fileSchema, required: true },
    fileDraftProposal: { type: fileSchema, required: true },

    // Proses oleh UPPS
    dosenDitetapkan: { type: mongoose.Schema.Types.ObjectId, ref: 'Dosen', default: null },
    status: {
      type: String,
      enum: ['pending', 'diproses', 'disetujui', 'ditolak'],
      default: 'pending',
    },
    catatanAdmin: { type: String, default: '' },
    diprosesOleh: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tanggalDiproses: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pengajuan', pengajuanSchema);
