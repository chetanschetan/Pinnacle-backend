import mongoose, { Schema, Document } from 'mongoose';

// 1. Define the Interface (This is the "Professional" TS way)
export interface IConsultation extends Document {
  user: mongoose.Types.ObjectId;
  answers: {
    service: string;
    requirementType: string;
    incomeRange: string;
    incomeSources: string[];
    name: string;
    email: string;
    phone: string;
  };
  status: 'pending' | 'ongoing' | 'accepted' | 'rejected';
  adminComment?: string;
  documents: {
    path: string;
    status: 'pending' | 'verified' | 'rejected';
  }[];
}

const consultationSchema = new Schema<IConsultation>({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: {
    service: { type: String, required: true },
    requirementType: { type: String, required: true },
    incomeRange: { type: String, required: true },
    incomeSources: { type: [String], default: [] },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { 
      type: String, 
      required: true, 
      match: [/^\d{10}$/, "Only 10 digits allowed"]
    },
  },
  status: { 
    type: String, 
    enum: ['pending', 'ongoing', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  adminComment: { type: String, default: "" },
  documents: [{
    path: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'verified', 'rejected'], 
      default: 'pending' 
    }
  }]
}, { timestamps: true });

// 2. Use 'export' instead of 'module.exports'
export const Consultation = mongoose.model<IConsultation>('Consultation', consultationSchema);