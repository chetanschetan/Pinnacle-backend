import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { Request } from 'express';

// 1. S3 Client with explicit trim and credentials
const s3 = new S3Client({
  region: (process.env.AWS_REGION || 'ap-south-1').trim(),
  credentials: {
    accessKeyId: String(process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY || '').trim(),
  }
});

// 2. Use Memory Storage to completely avoid multer-s3 bugs
const storage = multer.memoryStorage();

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

// 3. Helper function to upload buffer directly to S3
export const uploadBufferToS3 = async (file: Express.Multer.File): Promise<string> => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const fileName = `uploads/${uniqueSuffix}-${file.originalname}`;
  const bucketName = process.env.AWS_S3_BUCKET_NAME || 'pinnacle-storage-2026';

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  // Return the public file URL
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileName}`;
};