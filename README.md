<<<<<<< HEAD
# Sipenda — Sistem Pengajuan Dosen Pembimbing Karya Akhir

Aplikasi web untuk mengelola pengajuan dosen pembimbing karya akhir (skripsi/tugas akhir), dengan dua peran:

- **Mahasiswa** — mengajukan judul karya akhir & memilih 2 preferensi dosen pembimbing, memantau status.
- **UPPS (Admin)** — meninjau, menyetujui/menolak pengajuan, menetapkan dosen pembimbing final, mengelola master data dosen.

## Stack

| Bagian | Teknologi |
|---|---|
| Backend | Node.js + Express.js |
| Database | MongoDB (Mongoose) |
| Autentikasi | Google OAuth 2.0 (Passport.js) |
| Frontend | EJS + CSS custom (server-rendered) |
| Session Store | MongoDB (connect-mongo) |

## Struktur Folder

```
pengajuan-dosen/
├── config/         # koneksi DB & strategi passport
├── middleware/      # auth guard (ensureAuthenticated, ensureRole)
├── models/          # User, Dosen, Pengajuan
├── routes/          # auth, mahasiswa, upps
├── views/            # template EJS (layout, login, mahasiswa/*, upps/*)
├── public/css/       # stylesheet
├── scripts/seed.js  # data dosen contoh
└── server.js
```

## 1. Setup Lokal

```bash
git clone <repo-anda>
cd pengajuan-dosen
npm install
cp .env.example .env
```

Isi `.env` sesuai poin 2 dan 3 di bawah, lalu:

```bash
npm run seed     # opsional: isi contoh data dosen
npm run dev      # jalankan dengan nodemon di http://localhost:3000
```

## 2. Setup MongoDB

1. Buat cluster gratis di [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Buat database user, whitelist IP `0.0.0.0/0` (atau IP server deploy Anda).
3. Salin connection string ke `MONGO_URI` pada `.env`.

## 3. Setup Google OAuth 2.0

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat project baru.
2. Menu **APIs & Services → OAuth consent screen** → pilih External, isi nama aplikasi & email.
3. Menu **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (development)
     - `https://domain-deploy-anda.com/auth/google/callback` (production)
4. Salin **Client ID** & **Client Secret** ke `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

### Penentuan Role (Mahasiswa vs UPPS)

Karena Google OAuth hanya mengonfirmasi identitas, role ditentukan otomatis saat login pertama:

- Email yang terdaftar di `ADMIN_EMAILS` (dipisah koma) di `.env` → otomatis menjadi **`upps`**.
- Email lainnya → otomatis menjadi **`mahasiswa`**.
- Opsional: gunakan `ALLOWED_EMAIL_DOMAIN` untuk membatasi login hanya email institusi (misal `@kampus.ac.id`).

Role disimpan permanen di database setelah user pertama kali login (lihat `models/User.js` & `config/passport.js`). Untuk mengubah role user yang sudah ada, admin bisa update langsung field `role` di koleksi `users` melalui MongoDB Atlas / Compass.

## 4. Alur Aplikasi

**Mahasiswa:**
1. Login dengan Google.
2. Ajukan dosen pembimbing: Nama Lengkap, NIM, Program Studi, konfirmasi cek transkrip dengan Dosen PA, jumlah SKS lulus & diampu, serta unggah 4 dokumen wajib:
   - Transkrip Nilai Sementara (PDF, maks 10MB)
   - Kartu Rencana Studi terbaru (PDF/dokumen/gambar, maks 10MB)
   - Formulir Dosen Pembimbing Karya Akhir (PDF/dokumen, maks 10MB)
   - Draft Proposal (PDF/dokumen, maks 10MB)
3. Pantau status pengajuan: `pending → diproses → disetujui/ditolak`, unduh kembali dokumen yang sudah dikirim.

**UPPS:**
1. Login dengan Google (email harus ada di `ADMIN_EMAILS`).
2. Lihat semua pengajuan masuk pada dashboard, filter berdasarkan status.
3. Buka detail pengajuan → unduh & periksa keempat dokumen (preferensi dosen dicantumkan mahasiswa di dalam dokumen "Formulir Dosen Pembimbing") → tetapkan dosen pembimbing final dari master data dosen → Setujui / Tandai Diproses / Tolak, sertakan catatan.
4. Kelola master data dosen (tambah, nonaktifkan, hapus, atur kuota bimbingan).

### Penyimpanan Dokumen

Dokumen yang diunggah mahasiswa disimpan di folder `/uploads` pada server (bukan di database — hanya metadata-nya yang disimpan di MongoDB) dan hanya bisa diunduh oleh mahasiswa pemilik pengajuan atau UPPS (route `/files/:pengajuanId/:field` dilindungi autentikasi & otorisasi).

**Penting untuk deployment:** Railway, Render, dan sejenisnya umumnya menggunakan **ephemeral filesystem** — file yang disimpan di disk lokal akan **hilang setiap kali aplikasi di-restart/redeploy**. Untuk production yang andal, ganti penyimpanan file di `middleware/upload.js` dengan layanan cloud storage (contoh: Cloudinary, AWS S3, atau Google Cloud Storage), atau gunakan **persistent volume/disk** jika platform deployment mendukungnya (Railway Volumes, Render Persistent Disks). Folder `/uploads` sudah dimasukkan ke `.gitignore` sehingga tidak ikut ter-commit ke Git.

## 5. Version Control (Git & GitHub)

```bash
git init
git add .
git commit -m "Initial commit: Sipenda - Sistem Pengajuan Dosen Karya Akhir"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

`.env` sudah masuk `.gitignore` — **jangan pernah commit file `.env`** berisi kredensial asli.

## 6. Deployment

Aplikasi ini bisa di-deploy ke Railway, Render, Koyeb, Fly.io, atau VPS mana pun yang menjalankan Node.js.

### Opsi A — Railway
1. Buat project baru → **Deploy from GitHub repo**, pilih repo ini.
2. Railway otomatis mendeteksi `npm start`.
3. Tab **Variables** → tambahkan semua variabel dari `.env.example` dengan nilai production.
4. Setelah deploy, salin domain yang diberikan (mis. `https://sipenda.up.railway.app`) dan:
   - Update `BASE_URL` & `GOOGLE_CALLBACK_URL` di Variables → `https://sipenda.up.railway.app/auth/google/callback`
   - Tambahkan URL callback tersebut di Google Cloud Console → Authorized redirect URIs.

### Opsi B — Render
1. **New → Web Service** → hubungkan repo GitHub.
2. Build Command: `npm install` · Start Command: `npm start`.
3. Tambahkan Environment Variables sesuai `.env.example`.
4. Setelah dapat domain (`https://sipenda.onrender.com`), update `GOOGLE_CALLBACK_URL` di Render & Google Cloud Console seperti di atas.

### Opsi C — Koyeb / Fly.io / VPS
- Prinsipnya sama: set environment variables, jalankan `npm install && npm start`, expose port sesuai `process.env.PORT`.
- Untuk VPS (Ubuntu, dsb.), gunakan `pm2` agar proses tetap hidup:
  ```bash
  npm install -g pm2
  pm2 start server.js --name sipenda
  pm2 save && pm2 startup
  ```
  Lalu pasang reverse proxy (Nginx) + SSL (Certbot) di depan aplikasi.

**Penting:** setiap kali domain production berubah, selalu update `GOOGLE_CALLBACK_URL` di `.env` deployment **dan** di daftar Authorized redirect URIs pada Google Cloud Console — jika tidak sinkron, login Google akan gagal dengan error `redirect_uri_mismatch`.

## 7. Pengembangan Lanjutan (opsional)

- Notifikasi email saat status pengajuan berubah (Nodemailer).
- Upload dokumen proposal (multer + penyimpanan cloud).
- Riwayat/log setiap perubahan status pengajuan.
- Endpoint API JSON terpisah bila ingin frontend SPA (React/Vue) di masa depan.
=======
# sipenda
>>>>>>> c84831e9c0c6739b9a1e3d0b2a46c5e90a69b072
