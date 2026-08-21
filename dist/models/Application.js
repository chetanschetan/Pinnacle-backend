"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const applicationSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
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
exports.Application = mongoose_1.default.model('Application', applicationSchema);
