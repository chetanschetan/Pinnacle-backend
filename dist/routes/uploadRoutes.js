"use strict";
// import express, { Request, Response } from 'express';
// import { upload } from '../config/s3';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = __importDefault(require("express"));
const s3_1 = require("../config/s3"); // Apne s3 config ka path check kar lena
const router = express_1.default.Router();
router.post('/upload', s3_1.upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = req.file.location;
    res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        fileUrl: fileUrl,
    });
});
exports.default = router;
