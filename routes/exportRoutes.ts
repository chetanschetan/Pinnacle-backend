// import { Router } from 'express';
// import { 
//   exportAllDataExcel, 
//   exportUsersPDF, 
//   exportSingleUserExcel, 
//   exportSingleUserPDF 
// } from '../controllers/exportController';
// import { protect, admin } from '../middleware/authMiddleware';

// const router = Router();

// // Master Exports (All Users Data)
// router.get('/excel', protect, admin, exportAllDataExcel);
// router.get('/pdf', protect, exportUsersPDF);

// // Individual User Specific Exports (Includes name in file title)
// router.get('/user/:userId/excel', protect, admin, exportSingleUserExcel);
// router.get('/user/:userId/pdf', protect, admin, exportSingleUserPDF);

// export default router;

import { Router } from 'express';
import { 
  exportAllDataExcel, 
  exportUsersPDF, 
  exportSingleUserExcel, 
  exportSingleUserPDF 
} from '../controllers/exportController';
import { protect, admin } from '../middleware/authMiddleware';

const router = Router();

// Master Export Routes (All Users)
router.get('/excel', protect, admin, exportAllDataExcel);
router.get('/pdf', protect, exportUsersPDF);

// Individual User Export Routes (Named after User)
router.get('/user/:userId/excel', protect, admin, exportSingleUserExcel);
router.get('/user/:userId/pdf', protect, admin, exportSingleUserPDF);

export default router;