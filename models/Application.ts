import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Placeholder Questions for Accounting Service
  answers: {
    businessType: { type: String, required: true }, // e.g. Freelancer, Pvt Ltd
    annualTurnover: { type: String, required: true },
    gstRegistered: { type: String, required: true },
    serviceNeeded: { type: String, required: true }, // e.g. Audit, Tax, Payroll
    message: { type: String } 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  adminFeedback: { type: String, default: "" }, // For the "refusal" message
  documents: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export const Application = mongoose.model('Application', applicationSchema);