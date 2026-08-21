import express from 'express';
import { sendMessage, getChatHistory, getAdminInfo } from '../controllers/chatController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/send', protect, sendMessage);
router.get('/history/:otherId', protect, getChatHistory);
router.get('/admin-info', protect, getAdminInfo);

export default router;