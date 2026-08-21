import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';

import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import consultationRoutes from './routes/consultationRoutes'; 
import chatRoutes from './routes/chatRoutes';
import exportRoutes from './routes/exportRoutes';
import uploadRoutes from './routes/uploadRoutes';

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

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
const io = new Server(server, {
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
    } else {
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
app.use(helmet({ crossOriginResourcePolicy: false }));
// Explicit Preflight Handling for Cloudflare Tunnel & AWS
app.options('*', cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(cors({
  origin: true, // Sabhi origins allow karega tunnel ke through
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base API Routes
app.use('/api/auth', authRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/export', exportRoutes);
app.use('/api', uploadRoutes);

// Test Endpoint
app.get('/api/test', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "Backend API is live!" });
});

app.get('/', (req, res) => res.send('Pinnacle API Active'));

// Server Binding on 0.0.0.0
const PORT = process.env.PORT || 5000;
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Production Server Ready on Port ${PORT}`);
});