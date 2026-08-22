import { Request, Response } from 'express';
import { Consultation } from '../models/Consultation';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import nodemailer from 'nodemailer';

// const s3 = new S3Client({
//   region: process.env.AWS_REGION || 'ap-south-1',
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
//   }
// });

const s3 = new S3Client({
  region: (process.env.AWS_REGION || 'ap-south-1').trim(),
  credentials: {
    accessKeyId: String(process.env.AWS_ACCESS_KEY_ID || '').trim().replace(/['"]+/g, ''),
    secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY || '').trim().replace(/['"]+/g, ''),
  }
});

const sendStatusEmail = async (userEmail: string, userName: string, status: string, comment: string) => {
  const transporter = nodemailer.createTransport({
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
export const getMyConsultations = async (req: any, res: Response) => {
  try {
    const myRequests = await Consultation.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json(myRequests || []);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching requests", error: error.message });
  }
};

// 2. ADMIN: Get all requests from all users (Newest first)
export const getAllRequestsAdmin = async (req: Request, res: Response) => {
  try {
    const requests = await Consultation.find()
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch requests", error: error.message });
  }
};

// 3. ADMIN: Get only accepted clients for document vault
export const getAcceptedClients = async (req: Request, res: Response) => {
  try {
    const accepted = await Consultation.find({ status: 'accepted' })
      .populate('user', 'fullName email')
      .sort({ updatedAt: -1 });
    res.json(accepted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN: Delete a specific consultation request
export const deleteRequestAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedRequest = await Consultation.findByIdAndDelete(id);

    if (!deletedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json({ message: "Consultation request deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Deletion failed", error: error.message });
  }
};

// Submit Consultation Request
export const submitConsultation = async (req: any, res: Response) => {
  try {
    const { answers } = req.body;

    const newRequest = await Consultation.create({
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
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Server Error: Could not submit request", 
      error: error.message 
    });
  }
};

// Upload Consultation Documents (S3 Fix applied)
export const uploadConsultationDocs = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'pinnacle-storage-2026';
    const region = process.env.AWS_REGION || 'ap-south-1';

    // Har file ko S3 par manually upload karo aur URL banao
    const filePaths = await Promise.all(
      req.files.map(async (file: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `uploads/${uniqueSuffix}-${file.originalname}`;

        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        });

        await s3.send(command);

        const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

        return {
          path: fileUrl, // S3 Public URL
          status: 'pending'
        };
      })
    );

    const updatedConsultation = await Consultation.findByIdAndUpdate(
      id,
      { $push: { documents: { $each: filePaths } } },
      { new: true }
    );

    res.status(200).json({ message: "Files uploaded successfully", data: updatedConsultation });
  } catch (error: any) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: "Server error during upload", error: error.message });
  }
};

// Delete Document (S3 Delete fix applied)
export const deleteDocument = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { filePath } = req.body; // S3 URL

    const consultation = await Consultation.findById(id);
    if (!consultation) return res.status(404).json({ message: "Not found" });

    const initialCount = consultation.documents.length;
    
    consultation.documents = consultation.documents.filter((doc: any) => {
      const currentPath = typeof doc === 'string' ? doc : doc.path;
      return currentPath !== filePath;
    });

    if (consultation.documents.length < initialCount) {
      await consultation.save();
      
      // Delete from AWS S3 bucket
      try {
        const urlObj = new URL(filePath);
        const s3Key = decodeURIComponent(urlObj.pathname.substring(1));

        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME || 'pinnacle-storage-2026',
          Key: s3Key
        }));
      } catch (s3Err) {
        console.error("S3 Delete Error (DB entry removed):", s3Err);
      }
    }

    res.status(200).json({ 
      message: "Deleted", 
      documents: consultation.documents 
    });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Delete failed" });
  }
};

// Update Request Status & Send Email
export const updateRequestStatus = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status: updatedStatus, adminComment } = req.body;

    const updated: any = await Consultation.findByIdAndUpdate(
      id,
      { status: updatedStatus, adminComment },
      { returnDocument: 'after' }
    ).populate('user').exec();

    if (!updated) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    if (updated.user && typeof updated.user === 'object' && updated.user.email) {
      try {
        await sendStatusEmail(
          updated.user.email, 
          updated.user.fullName, 
          updatedStatus, 
          adminComment
        );
      } catch (mailErr) {
        console.error("❌ Mail Service Error:", mailErr);
      }
    }

    return res.status(200).json({ success: true, message: "Status updated", data: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Update failed" });
  }
};