"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const protect = async (req, res, next) => {
    let token;
    // 1. Get token from the 'jwt' cookie
    token = req.cookies.jwt;
    if (token) {
        try {
            // 2. Verify the token using your Secret Key
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // 3. Find the user in DB and attach to req (excluding password for security)
            req.user = await User_1.User.findById(decoded.userId).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }
            next(); // Move to the next controller/middleware
        }
        catch (error) {
            console.error("Token Verification Error:", error);
            res.status(401).json({ message: 'Not authorized, token invalid' });
        }
    }
    else {
        // 4. No token found
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};
exports.protect = protect;
// Middleware to restrict access to Admins only
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        res.status(403).json({ message: 'Access denied: Admins only' });
    }
};
exports.admin = admin;
