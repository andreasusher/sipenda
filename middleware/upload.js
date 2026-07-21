const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const MIME = {
  pdf: ['application/pdf'],
  pdfDocImage: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ],
  pdfDoc: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// Field name -> tipe file yang diizinkan, sesuai ketentuan form
const FIELD_RULES = {
  fileTranskripNilai: MIME.pdf,
  fileKrs: MIME.pdfDocImage,
  fileFormulirDosen: MIME.pdfDoc,
  fileDraftProposal: MIME.pdfDoc,
};

function fileFilter(req, file, cb) {
  const allowed = FIELD_RULES[file.fieldname];
  if (!allowed) return cb(new Error('Field file tidak dikenali.'));
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error(`Format file untuk "${file.fieldname}" tidak didukung.`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file, sesuai ketentuan form
});

const pengajuanUploadFields = upload.fields([
  { name: 'fileTranskripNilai', maxCount: 1 },
  { name: 'fileKrs', maxCount: 1 },
  { name: 'fileFormulirDosen', maxCount: 1 },
  { name: 'fileDraftProposal', maxCount: 1 },
]);

module.exports = { upload, pengajuanUploadFields, uploadDir };
