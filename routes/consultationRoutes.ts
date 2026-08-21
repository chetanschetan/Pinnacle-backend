// import express from 'express';
// import { Request, Response } from 'express';
// import { getMyConsultations,submitConsultation } from '../controllers/consultationController';
// import { protect, admin } from '../middleware/authMiddleware';
// import { Consultation } from '../models/Consultation'; 
// import { deleteRequestAdmin } from '../controllers/consultationController';
// import { upload } from '../middleware/uploadMiddleware';
// import { uploadConsultationDocs } from '../controllers/consultationController';
// import { deleteDocument } from '../controllers/consultationController';
// import { updateRequestStatus } from '../controllers/consultationController'

// const router = express.Router();

// // The 'protect' middleware ensures only logged-in users reach this code
// router.get('/my-requests', protect, getMyConsultations);
// router.post('/submit', protect, submitConsultation);
// router.get('/admin/request/:id', protect, admin, async (req, res) => {
//   const request = await Consultation.findById(req.params.id).populate('user', 'fullName email');
//   res.json(request);
// });
// router.post('/submit', protect, async (req: any, res: Response) => {
//   try {
//     const { answers } = req.body;

//     // Validation: Ensure all 5 fields are present
//     if (!answers.industry || !answers.revenue || !answers.currentSystem || !answers.serviceNeed || !answers.employeeCount) {
//       return res.status(400).json({ message: "Please answer all questions before submitting." });
//     }

//     const newConsultation = await Consultation.create({
//       user: req.user._id, // Provided by protect middleware
//       answers,           // The object containing all 5 answers
//       status: 'pending'
//     });

//     res.status(201).json(newConsultation);
//   } catch (error: any) {
//     console.error("Submission Error:", error);
//     res.status(500).json({ message: "Database error during submission", error: error.message });
//   }
// });
// // GET /api/consultations/admin/all
// router.get('/admin/all', protect, admin, async (req: Request, res: Response) => {
//   try {
//     // .populate('user') looks at the 'user' ID in the consultation 
//     // and fetches the 'fullName' and 'email' from the User collection.
//     const allRequests = await Consultation.find()
//       .populate('user', 'fullName email') 
//       .sort({ submittedAt: -1 });

//     res.status(200).json(allRequests);
//   } catch (error: any) {
//     res.status(500).json({ message: "Failed to fetch requests", error: error.message });
//   }
// });

// // On your Detail Page, when you click "Accept" or "Reject", it calls the PUT route. You need this backend function to handle that request.
// // PUT /api/consultations/admin/update/:id
// router.put('/admin/update/:id', protect, admin, async (req: Request, res: Response) => {
//   try {
//     const { status, adminComment } = req.body;

//     // Validate the new status
//     const allowedStatuses = ['pending', 'accepted', 'rejected', 'ongoing'];
//     if (!allowedStatuses.includes(status)) {
//       return res.status(400).json({ message: "Invalid status update" });
//     }

//     const updatedRequest = await Consultation.findByIdAndUpdate(
//       req.params.id,
//       { 
//         status, 
//         adminComment: adminComment || "No comment provided by admin." 
//       },
//       { new: true } // Returns the modified document
//     ).populate('user', 'fullName email');

//     if (!updatedRequest) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     res.status(200).json(updatedRequest);
//   } catch (error: any) {
//     res.status(500).json({ message: "Update failed", error: error.message });
//   }
// });

// router.delete('/admin/delete/:id', protect, admin, deleteRequestAdmin);
// router.post('/upload-docs/:id', protect, upload.array('documents', 5), uploadConsultationDocs);
// router.delete('/:id/document', protect, deleteDocument);
// router.put('/admin/update-status/:id', protect, admin, updateRequestStatus);
// export default router;


import express from 'express';
import { Request, Response } from 'express';
import { getMyConsultations, submitConsultation } from '../controllers/consultationController';
import { protect, admin } from '../middleware/authMiddleware';
import { Consultation } from '../models/Consultation'; 
import { deleteRequestAdmin } from '../controllers/consultationController';
import { upload } from '../middleware/uploadMiddleware';
import { uploadConsultationDocs } from '../controllers/consultationController';
import { deleteDocument } from '../controllers/consultationController';
import { updateRequestStatus } from '../controllers/consultationController';

const router = express.Router();

router.get('/my-requests', protect, getMyConsultations);
router.post('/submit', protect, submitConsultation);

router.get('/admin/request/:id', protect, admin, async (req, res) => {
  const request = await Consultation.findById(req.params.id).populate('user', 'fullName email');
  res.json(request);
});

router.post('/submit-data', protect, async (req: any, res: Response) => {
  try {
    const { answers } = req.body;
    if (!answers.industry || !answers.revenue || !answers.currentSystem || !answers.serviceNeed || !answers.employeeCount) {
      return res.status(400).json({ message: "Please answer all questions before submitting." });
    }

    const newConsultation = await Consultation.create({
      user: req.user._id,
      answers,
      status: 'pending'
    });

    res.status(201).json(newConsultation);
  } catch (error: any) {
    console.error("Submission Error:", error);
    res.status(500).json({ message: "Database error during submission", error: error.message });
  }
});

router.get('/admin/all', protect, admin, async (req: Request, res: Response) => {
  try {
    const allRequests = await Consultation.find()
      .populate('user', 'fullName email') 
      .sort({ submittedAt: -1 });

    res.status(200).json(allRequests);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch requests", error: error.message });
  }
});

router.put('/admin/update/:id', protect, admin, async (req: Request, res: Response) => {
  try {
    const { status, adminComment } = req.body;
    const allowedStatuses = ['pending', 'accepted', 'rejected', 'ongoing'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status update" });
    }

    const updatedRequest = await Consultation.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        adminComment: adminComment || "No comment provided by admin." 
      },
      { new: true }
    ).populate('user', 'fullName email');

    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json(updatedRequest);
  } catch (error: any) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
});

router.delete('/admin/delete/:id', protect, admin, deleteRequestAdmin);
router.post('/upload-docs/:id', protect, upload.array('documents', 5), uploadConsultationDocs);
router.delete('/:id/document', protect, deleteDocument);
router.put('/admin/update-status/:id', protect, admin, updateRequestStatus);

export default router;