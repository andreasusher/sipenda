const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['mahasiswa', 'upps'], default: 'mahasiswa' },
    // Data tambahan untuk mahasiswa (dilengkapi saat pertama kali mengajukan)
    nim: { type: String, default: '' },
    prodi: { type: String, default: '' },
    noHp: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
