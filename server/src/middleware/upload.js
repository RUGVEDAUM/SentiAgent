import multer from 'multer';

// Use memory storage so CSV files can be parsed directly from buffer without leaving temporary files on disk
const storage = multer.memoryStorage();

export const uploadCsv = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const isCsvOrText =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv') ||
      file.originalname.toLowerCase().endsWith('.txt');

    if (isCsvOrText) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV or TXT files are supported.'));
    }
  }
});
