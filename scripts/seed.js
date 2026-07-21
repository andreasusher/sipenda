// Jalankan: node scripts/seed.js
// Mengisi beberapa data dosen contoh agar mahasiswa bisa langsung mencoba mengajukan.
require('dotenv').config();
const mongoose = require('mongoose');
const Dosen = require('../models/Dosen');

const dataDosen = [
  { nama: 'Dr. Ahmad Fauzi, M.Kom', nidn: '0001018501', bidangKeahlian: 'Rekayasa Perangkat Lunak', kuotaBimbingan: 8 },
  { nama: 'Dr. Siti Rahmawati, M.T', nidn: '0002028502', bidangKeahlian: 'Kecerdasan Buatan', kuotaBimbingan: 8 },
  { nama: 'Budi Santoso, M.Kom', nidn: '0003038503', bidangKeahlian: 'Jaringan Komputer & Keamanan', kuotaBimbingan: 10 },
  { nama: 'Dewi Lestari, M.Sc', nidn: '0004048504', bidangKeahlian: 'Sistem Informasi & Basis Data', kuotaBimbingan: 10 },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Terhubung ke MongoDB, memulai seeding...');

  for (const d of dataDosen) {
    await Dosen.updateOne({ nidn: d.nidn }, { $setOnInsert: d }, { upsert: true });
    console.log(`✓ ${d.nama}`);
  }

  console.log('Seeding selesai.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
