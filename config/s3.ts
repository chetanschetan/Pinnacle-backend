import multer from 'multer';
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import multerS3 from 'multer-s3';
import path from 'path';
import { Request } from 'express';


dotenv.config();

// Explicitly environment variables ko trim karke aur credentials object mein wrap karke bhejo
const s3 = new S3Client({
  region: (process.env.AWS_REGION || "ap-south-1").trim(),
  credentials: {
    accessKeyId: String(process.env.AWS_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
  },
});

const storage = multerS3({
  s3: s3,
  bucket: 'pinnacle-storage-2026',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `uploads/${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const isExtValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const isMimeValid = allowedTypes.test(file.mimetype);

  if (isExtValid && isMimeValid) {
    return cb(null, true);
  }
  cb(new Error('Only .png, .jpg, .jpeg and .pdf formats allowed!'));
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});