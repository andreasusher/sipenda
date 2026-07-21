const mongoose = require('mongoose');

const dosenSchema = new mongoose.Schema(
  {
    nama: { type: String, required: true },
    nidn: { type: String, required: true, unique: true },
    bidangKeahlian: { type: String, required: true },
    email: { type: String, default: '' },
    kuotaBimbingan: { type: Number, default: 10 },
    jumlahBimbinganAktif: { type: Number, default: 0 },
    aktif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dosen', dosenSchema);
