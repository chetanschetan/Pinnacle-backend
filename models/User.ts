import mongoose, { Schema, Document, model } from 'mongoose';

// 1. Define the Interface for TypeScript Safety
export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  location: string;
  role: 'user' | 'admin';
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailOtp?: string;        // Added for Task #2
  emailOtpExpires?: Date;   // Added for Task #2
  phoneOtp?: string;
  phoneOtpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false }, // Don't return password in queries
  location: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  phone: { 
    type: String, 
    required: false, 
    unique: true,
    match: [/^\d{10}$/, "Please provide a valid 10-digit phone number"] // Enforcing Task #3
  },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  
  // OTP Fields with 'select: false' for security
  emailOtp: { type: String, select: false },
  emailOtpExpires: { type: Date, select: false },
  phoneOtp: { type: String, select: false },
  phoneOtpExpires: { type: Date, select: false }
}, { timestamps: true });

// 2. Export the Model
export const User = mongoose.model<IUser>('User', userSchema);