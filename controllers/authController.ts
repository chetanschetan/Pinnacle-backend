import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { sendOTP } from '../utils/mailer'; // Using the mailer we built 

// Generate JWT Token
const generateToken = (res: Response, userId: string) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || '', {
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
export const registerUser = async (req: Request, res: Response) => {
  const { fullName, email, password, location, phone } = req.body;
  if (!email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  const userExists = await User.findOne({ email });
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

  const user = await User.create({
      fullName,
      email: email.toLowerCase(), // Normalize email
      password: hashedPassword,
      location,
      phone,
      emailOtp: otp,          // Storing the code
      emailOtpExpires: otpExpires,
      isEmailVerified: false,
  });


  // Add this temporary check
const savedUser = await User.findById(user._id).select('+emailOtp +emailOtpExpires');
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
        await sendOTP({ 
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
      } catch (emailErr) {
        console.error("Email Service Error:", emailErr);
        // Professional fallback: Tell user account is created but email failed
        res.status(201).json({ 
          success: true, 
          message: 'Account created, but we had trouble sending the email. Please click resend OTP.' 
        });
      }
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc    Auth user & get token
export const loginUser = async (req: Request, res: Response) => {
  try {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password'); // The '+password' tells Mongoose to include the hidden field becuase we used (password: { select: false }) in USer model.

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
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
}catch (error: any) {
    console.error("Backend Login Error:", error); // Check your terminal for this log!
    return res.status(500).json({ message: 'Server error during login' });
  }
};

export const logoutUser = (req: Request, res: Response) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0), // Sets expiration to 1970 (immediate delete)
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Verify Email OTP & Issue JWT (The final "Unlock")
// @route   POST /api/auth/verify-email
export const verifyEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    // 1. Fetch user including hidden OTP fields
    const user = await User.findOne({ email }).select('+emailOtp +emailOtpExpires');

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
    user.emailOtp = undefined;        // Clear the code after use
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

  } catch (error: any) {
    console.error("Verification Error:", error);
    res.status(500).json({ message: 'Internal Server Error during verification' });
  }
};

// @desc    Resend Email OTP
// @route   POST /api/auth/resend-otp
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

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
    await sendOTP({ email: user.email, subject: "Your New Verification Code", otp: newOtp });

    res.status(200).json({ message: "New OTP sent to your email!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};