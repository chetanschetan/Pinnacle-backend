import multer from 'multer';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import path from 'path';
import { Request, Response } from 'express';

dotenv.config();

// 1. Explicit aur Clean S3 Client Initialization
const s3Client = new S3Client({
  region: (process.env.AWS_REGION || "ap-south-1").trim(),
  credentials: {
    accessKeyId: String(process.env.AWS_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
  },
});

// 2. Use Memory Storage instead of multer-s3 to avoid internal header malformed bugs
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

// Export Multer upload middleware
export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// 3. Controller function to handle S3 Upload explicitly
export const uploadFileToS3 = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const file = req.file;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `uploads/${uniqueSuffix}-${file.originalname}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME || "pinnacle-storage-2026";

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Public file URL generation
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${fileName}`;

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      fileUrl: fileUrl,
      key: fileName
    });

  } catch (error: any) {
    console.error("S3 Upload Error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal Server Error during upload" });
  }
};