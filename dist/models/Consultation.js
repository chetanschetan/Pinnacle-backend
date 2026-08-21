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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Consultation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const consultationSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
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
exports.Consultation = mongoose_1.default.model('Consultation', consultationSchema);
