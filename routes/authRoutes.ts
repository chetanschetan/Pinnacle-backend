import express, { Request, Response } from 'express';
import { registerUser, loginUser, logoutUser, verifyEmailOTP } from '../controllers/authController';

const router = express.Router();

router.post('/register', registerUser);
router.post('/signup', registerUser); // Fallback mapped
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/verify-email', verifyEmailOTP);

router.get('/test', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Auth route working cleanly!",
    timestamp: new Date().toISOString()
  });
});

export default router;