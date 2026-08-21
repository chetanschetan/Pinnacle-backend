"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
router.post('/register', authController_1.registerUser);
router.post('/signup', authController_1.registerUser); // Fallback mapped
router.post('/login', authController_1.loginUser);
router.post('/logout', authController_1.logoutUser);
router.post('/verify-email', authController_1.verifyEmailOTP);
router.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Auth route working cleanly!",
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
