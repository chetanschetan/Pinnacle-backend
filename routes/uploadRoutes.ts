// import express, { Request, Response } from 'express';
// import { upload } from '../config/s3';

// const router = express.Router();

// router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
//   if (!req.file) {
//     return res.status(400).json({ success: false, message: 'No file uploaded' });
//   }

//   // S3 upload hone par multer-s3 req.file me 'location' URL deta hai
//   const fileUrl = (req.file as any).location;

//   res.status(200).json({
//     success: true,
//     message: 'File uploaded successfully',
//     fileUrl: fileUrl,
//   });
// });

// export default router;

import express, { Request, Response } from 'express';
import { upload } from '../config/s3'; // Apne s3 config ka path check kar lena

const router = express.Router();

router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const fileUrl = (req.file as any).location;

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    fileUrl: fileUrl,
  });
});

export default router;