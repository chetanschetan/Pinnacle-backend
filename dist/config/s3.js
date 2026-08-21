"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const multer_s3_1 = __importDefault(require("multer-s3"));
const path_1 = __importDefault(require("path"));
console.log("CHECKING S3 ENV:", {
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_BUCKET_NAME,
    hasKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecret: !!process.env.AWS_SECRET_ACCESS_KEY
});
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});
const storage = (0, multer_s3_1.default)({
    s3: s3,
    bucket: 'pinnacle-storage-2026',
    contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `uploads/${uniqueSuffix}-${file.originalname}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const isExtValid = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const isMimeValid = allowedTypes.test(file.mimetype);
    if (isExtValid && isMimeValid) {
        return cb(null, true);
    }
    cb(new Error('Only .png, .jpg, .jpeg and .pdf formats allowed!'));
};
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
