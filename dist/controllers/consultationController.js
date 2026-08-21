"use strict";
// import { Request, Response } from 'express';
// import { Consultation } from '../models/Consultation';
// const path = require('path');
// const fs = require('fs')
// import nodemailer from 'nodemailer';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRequestStatus = exports.deleteDocument = exports.uploadConsultationDocs = exports.submitConsultation = exports.deleteRequestAdmin = exports.getAcceptedClients = exports.getAllRequestsAdmin = exports.getMyConsultations = void 0;
const Consultation_1 = require("../models/Consultation");
const client_s3_1 = require("@aws-sdk/client-s3");
const nodemailer_1 = __importDefault(require("nodemailer"));
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});
const sendStatusEmail = async (userEmail, userName, status, comment) => {
    const transporter = nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const mailOptions = {
        from: '"Pinnacle Accounting" <noreply@pinnacle.com>',
        to: userEmail,
        subject: `Update on your Consultation: ${status.toUpperCase()}`,
        html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1e293b;">Hello ${userName},</h2>
        <p>There is an update regarding your professional consultation request.</p>
        <div style="padding: 15px; background: #f8fafc; border-radius: 8px; margin: 20px 0;">
          <strong>New Status:</strong> <span style="text-transform: uppercase;">${status}</span><br/>
          <strong>Expert Feedback:</strong> ${comment}
        </div>
        <p>Please log in to your dashboard to take the next steps.</p>
        <a href="http://localhost:5173/userdashboard" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;">View Dashboard</a>
      </div>
    `,
    };
    await transporter.sendMail(mailOptions);
};
// 1. USER: Get all my requests (Newest first)
const getMyConsultations = async (req, res) => {
    try {
        const myRequests = await Consultation_1.Consultation.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        res.status(200).json(myRequests || []);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching requests", error: error.message });
    }
};
exports.getMyConsultations = getMyConsultations;
// 2. ADMIN: Get all requests from all users (Newest first)
const getAllRequestsAdmin = async (req, res) => {
    try {
        const requests = await Consultation_1.Consultation.find()
            .populate('user', 'fullName email')
            .sort({ createdAt: -1 });
        res.status(200).json(requests);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch requests", error: error.message });
    }
};
exports.getAllRequestsAdmin = getAllRequestsAdmin;
// 3. ADMIN: Get only accepted clients for document vault
const getAcceptedClients = async (req, res) => {
    try {
        const accepted = await Consultation_1.Consultation.find({ status: 'accepted' })
            .populate('user', 'fullName email')
            .sort({ updatedAt: -1 });
        res.json(accepted);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAcceptedClients = getAcceptedClients;
// ADMIN: Delete a specific consultation request
const deleteRequestAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRequest = await Consultation_1.Consultation.findByIdAndDelete(id);
        if (!deletedRequest) {
            return res.status(404).json({ message: "Request not found" });
        }
        res.status(200).json({ message: "Consultation request deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Deletion failed", error: error.message });
    }
};
exports.deleteRequestAdmin = deleteRequestAdmin;
// Submit Consultation Request
const submitConsultation = async (req, res) => {
    try {
        const { answers } = req.body;
        const newRequest = await Consultation_1.Consultation.create({
            user: req.user._id,
            answers: {
                service: answers.service,
                requirementType: answers.requirementType,
                incomeRange: answers.incomeRange,
                incomeSources: answers.incomeSources,
                name: answers.name,
                email: answers.email,
                phone: answers.phone
            },
            status: 'pending'
        });
        res.status(201).json({
            success: true,
            message: "Consultation request submitted successfully",
            data: newRequest
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error: Could not submit request",
            error: error.message
        });
    }
};
exports.submitConsultation = submitConsultation;
// Upload Consultation Documents (S3 Fix applied)
const uploadConsultationDocs = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }
        // Map S3 file locations into the documents array format
        const filePaths = req.files.map((file) => ({
            path: file.location, // S3 URL
            status: 'pending'
        }));
        const updatedConsultation = await Consultation_1.Consultation.findByIdAndUpdate(id, { $push: { documents: { $each: filePaths } } }, { new: true });
        res.status(200).json({ message: "Files uploaded successfully", data: updatedConsultation });
    }
    catch (error) {
        console.error("UPLOAD ERROR:", error);
        res.status(500).json({ message: "Server error during upload" });
    }
};
exports.uploadConsultationDocs = uploadConsultationDocs;
// Delete Document (S3 Delete fix applied)
const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { filePath } = req.body; // S3 URL
        const consultation = await Consultation_1.Consultation.findById(id);
        if (!consultation)
            return res.status(404).json({ message: "Not found" });
        const initialCount = consultation.documents.length;
        consultation.documents = consultation.documents.filter((doc) => {
            const currentPath = typeof doc === 'string' ? doc : doc.path;
            return currentPath !== filePath;
        });
        if (consultation.documents.length < initialCount) {
            await consultation.save();
            // Delete from AWS S3 bucket
            try {
                const urlObj = new URL(filePath);
                const s3Key = decodeURIComponent(urlObj.pathname.substring(1));
                await s3.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME || 'pinnacle-storage-2026',
                    Key: s3Key
                }));
            }
            catch (s3Err) {
                console.error("S3 Delete Error (DB entry removed):", s3Err);
            }
        }
        res.status(200).json({
            message: "Deleted",
            documents: consultation.documents
        });
    }
    catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: "Delete failed" });
    }
};
exports.deleteDocument = deleteDocument;
// Update Request Status & Send Email
const updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status: updatedStatus, adminComment } = req.body;
        const updated = await Consultation_1.Consultation.findByIdAndUpdate(id, { status: updatedStatus, adminComment }, { returnDocument: 'after' }).populate('user').exec();
        if (!updated) {
            return res.status(404).json({ message: "Consultation not found" });
        }
        if (updated.user && typeof updated.user === 'object' && updated.user.email) {
            try {
                await sendStatusEmail(updated.user.email, updated.user.fullName, updatedStatus, adminComment);
            }
            catch (mailErr) {
                console.error("❌ Mail Service Error:", mailErr);
            }
        }
        return res.status(200).json({ success: true, message: "Status updated", data: updated });
    }
    catch (error) {
        return res.status(500).json({ message: "Update failed" });
    }
};
exports.updateRequestStatus = updateRequestStatus;
