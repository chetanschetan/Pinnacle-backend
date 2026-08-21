"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendChatNotificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// 1. Define the Transporter once
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // This MUST be your 16-digit App Password
    },
});
// 2. Export the Chat Notification Function
const sendChatNotificationEmail = async (to, senderName, messageBody) => {
    try {
        const mailOptions = {
            from: '"Pinnacle Support" <noreply@pinnacle.com>',
            to,
            subject: `New Message from ${senderName}`,
            html: `
        <div style="font-family: sans-serif; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
          <h3 style="color: #1e293b;">You have a new message on Pinnacle!</h3>
          <p><strong>From:</strong> ${senderName}</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-style: italic;">
            "${messageBody}"
          </div>
          <p>Reply directly on your dashboard:</p>
          <a href="http://localhost:5173/chat" style="background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">Go to Chat</a>
        </div>
      `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent: " + info.response);
    }
    catch (error) {
        console.error("❌ Nodemailer Error:", error);
        // Don't crash the whole app if email fails
    }
};
exports.sendChatNotificationEmail = sendChatNotificationEmail;
