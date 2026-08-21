"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOTP = exports.verifyEmailOTP = exports.logoutUser = exports.loginUser = exports.registerUser = void 0;
const bcrypt = __importStar(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const mailer_1 = require("../utils/mailer"); // Using the mailer we built 
// Generate JWT Token
const generateToken = (res, userId) => {
    const token = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET || '', {
        expiresIn: '30d',
    });
    // Set as httpOnly cookie
    res.cookie('jwt', token, {
        httpOnly: true,
        // Force secure to true for Render (which uses HTTPS)
        secure: true,
        // 'none' is REQUIRED for cross-site (Vercel to Render)
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
};
// @desc    Register new user
const registerUser = async (req, res) => {
    const { fullName, email, password, location, phone } = req.body;
    if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    const userExists = await User_1.User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    console.log("THE OTP IS:", otp);
    const user = await User_1.User.create({
        fullName,
        email: email.toLowerCase(), // Normalize email
        password: hashedPassword,
        location,
        phone,
        emailOtp: otp, // Storing the code
        emailOtpExpires: otpExpires,
        isEmailVerified: false,
    });
    // Add this temporary check
    const savedUser = await User_1.User.findById(user._id).select('+emailOtp +emailOtpExpires');
    console.log("DATABASE CHECK:", savedUser);
    if (user) {
        // generateToken(res, user._id.toString());
        // res.status(201).json({
        //   _id: user._id,
        //   fullName: user.fullName,
        //   email: user.email,
        //   role: user.role,
        // });
        // 6. Send the Official OTP Email
        try {
            await (0, mailer_1.sendOTP)({
                email: user.email,
                subject: "Verify Your Pinnacle Account",
                otp: otp
            });
            // 7. Success Response (No Token/JWT here!)
            res.status(201).json({
                success: true,
                message: 'Registration successful. Please check your email for the OTP.',
                requiresVerification: true,
                email: user.email // Sent back so frontend can auto-fill the verify screen
            });
        }
        catch (emailErr) {
            console.error("Email Service Error:", emailErr);
            // Professional fallback: Tell user account is created but email failed
            res.status(201).json({
                success: true,
                message: 'Account created, but we had trouble sending the email. Please click resend OTP.'
            });
        }
    }
    else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};
exports.registerUser = registerUser;
// @desc    Auth user & get token
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.User.findOne({ email }).select('+password'); // The '+password' tells Mongoose to include the hidden field becuase we used (password: { select: false }) in USer model.
        if (user && (await bcrypt.compare(password, user.password))) {
            if (!user.isEmailVerified) {
                return res.status(401).json({
                    message: 'Please verify your email before logging in.',
                    isVerified: false
                });
            }
            generateToken(res, user._id.toString());
            res.status(200).json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    }
    catch (error) {
        console.error("Backend Login Error:", error); // Check your terminal for this log!
        return res.status(500).json({ message: 'Server error during login' });
    }
};
exports.loginUser = loginUser;
const logoutUser = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0), // Sets expiration to 1970 (immediate delete)
    });
    res.status(200).json({ message: 'Logged out successfully' });
};
exports.logoutUser = logoutUser;
// @desc    Verify Email OTP & Issue JWT (The final "Unlock")
// @route   POST /api/auth/verify-email
const verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        // 1. Fetch user including hidden OTP fields
        const user = await User_1.User.findOne({ email }).select('+emailOtp +emailOtpExpires');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // 2. Security Check: Is OTP valid and not expired?
        const isOtpValid = user.emailOtp === otp;
        const isNotExpired = user.emailOtpExpires && user.emailOtpExpires > new Date();
        if (!isOtpValid || !isNotExpired) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }
        // 3. Update User Status
        user.isEmailVerified = true;
        user.emailOtp = undefined; // Clear the code after use
        user.emailOtpExpires = undefined; // Clear expiration
        await user.save();
        // 4. Issue the Professional JWT (Login them in automatically)
        generateToken(res, user._id.toString());
        // 5. Return User Data for Frontend State (Redux/Context)
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            message: "Email verified successfully!"
        });
    }
    catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ message: 'Internal Server Error during verification' });
    }
};
exports.verifyEmailOTP = verifyEmailOTP;
// @desc    Resend Email OTP
// @route   POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_1.User.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (user.isEmailVerified) {
            return res.status(400).json({ message: "Email is already verified" });
        }
        // Generate new OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpires = new Date(Date.now() + 10 * 60 * 1000);
        // Update user
        user.emailOtp = newOtp;
        user.emailOtpExpires = newExpires;
        await user.save();
        // Send Email
        await (0, mailer_1.sendOTP)({ email: user.email, subject: "Your New Verification Code", otp: newOtp });
        res.status(200).json({ message: "New OTP sent to your email!" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to resend OTP" });
    }
};
exports.resendOTP = resendOTP;
