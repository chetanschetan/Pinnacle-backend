"use strict";
// import { Router } from 'express';
// import { 
//   exportAllDataExcel, 
//   exportUsersPDF, 
//   exportSingleUserExcel, 
//   exportSingleUserPDF 
// } from '../controllers/exportController';
// import { protect, admin } from '../middleware/authMiddleware';
Object.defineProperty(exports, "__esModule", { value: true });
// const router = Router();
// // Master Exports (All Users Data)
// router.get('/excel', protect, admin, exportAllDataExcel);
// router.get('/pdf', protect, exportUsersPDF);
// // Individual User Specific Exports (Includes name in file title)
// router.get('/user/:userId/excel', protect, admin, exportSingleUserExcel);
// router.get('/user/:userId/pdf', protect, admin, exportSingleUserPDF);
// export default router;
const express_1 = require("express");
const exportController_1 = require("../controllers/exportController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Master Export Routes (All Users)
router.get('/excel', authMiddleware_1.protect, authMiddleware_1.admin, exportController_1.exportAllDataExcel);
router.get('/pdf', authMiddleware_1.protect, exportController_1.exportUsersPDF);
// Individual User Export Routes (Named after User)
router.get('/user/:userId/excel', authMiddleware_1.protect, authMiddleware_1.admin, exportController_1.exportSingleUserExcel);
router.get('/user/:userId/pdf', authMiddleware_1.protect, authMiddleware_1.admin, exportController_1.exportSingleUserPDF);
exports.default = router;
