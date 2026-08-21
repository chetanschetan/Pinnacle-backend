"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/send', authMiddleware_1.protect, chatController_1.sendMessage);
router.get('/history/:otherId', authMiddleware_1.protect, chatController_1.getChatHistory);
router.get('/admin-info', authMiddleware_1.protect, chatController_1.getAdminInfo);
exports.default = router;
