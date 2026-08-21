"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const consultationRoutes_1 = __importDefault(require("./routes/consultationRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const exportRoutes_1 = __importDefault(require("./routes/exportRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
dotenv_1.default.config();
(0, db_1.default)();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Clean & Dynamic CORS Allowed Origins Handling
const rawOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ""))
    : [];
// Default origins fallback list
const defaultOrigins = [
    "https://pinnacle-frontend-gamma.vercel.app",
    "https://pinnacle-frontend-aq6v.vercel.app",
    "http://localhost:5173"
];
// Merge ENV origins with defaults and remove duplicates
const allowedOrigins = Array.from(new Set([...rawOrigins, ...defaultOrigins]));
// Socket.io Setup
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});
const onlineUsers = new Map();
io.on('connection', (socket) => {
    console.log(`⚡ Socket.io: Connected (${socket.id})`);
    socket.on('join', (userId) => {
        const cleanId = String(userId).trim();
        if (cleanId && cleanId !== "undefined" && cleanId !== "null") {
            onlineUsers.set(cleanId, socket.id);
            console.log(`👤 Socket.io: User Joined -> ${cleanId}`);
        }
    });
    socket.on('sendMessage', (data) => {
        const { receiverId, content, senderId, senderName } = data;
        const rId = String(receiverId).trim();
        const sId = String(senderId).trim();
        const receiverSocketId = onlineUsers.get(rId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receiveMessage', {
                senderId: sId,
                senderName,
                content,
                createdAt: new Date().toISOString()
            });
        }
        else {
            socket.emit('error', { message: "Recipient is offline" });
        }
    });
    socket.on('disconnect', () => {
        for (let [uId, sId] of onlineUsers.entries()) {
            if (sId === socket.id) {
                onlineUsers.delete(uId);
                break;
            }
        }
    });
});
// Middlewares
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false }));
// Explicit Preflight Handling for Cloudflare Tunnel & AWS
app.options('*', (0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use((0, cors_1.default)({
    origin: true, // Sabhi origins allow karega tunnel ke through
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Base API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/consultations', consultationRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api/export', exportRoutes_1.default);
app.use('/api', uploadRoutes_1.default);
// Test Endpoint
app.get('/api/test', (req, res) => {
    res.status(200).json({ success: true, message: "Backend API is live!" });
});
app.get('/', (req, res) => res.send('Pinnacle API Active'));
// Server Binding on 0.0.0.0
const PORT = process.env.PORT || 5000;
server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Production Server Ready on Port ${PORT}`);
});
