"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSingleUserPDF = exports.exportSingleUserExcel = exports.exportUsersPDF = exports.exportAllDataExcel = void 0;
const User_1 = require("../models/User");
const Consultation_1 = require("../models/Consultation");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
// Helper function to sanitize user names for clean filenames
const formatFileName = (name, extension) => {
    const cleanName = (name || 'User').trim().replace(/[^a-zA-Z0-9]/g, '_');
    return `${cleanName}_Consultation_Report.${extension}`;
};
// =============================================================
// 1. MASTER EXCEL EXPORT (ALL USERS & CONSULTATIONS)
// =============================================================
const exportAllDataExcel = async (req, res) => {
    try {
        const users = await User_1.User.find({}).lean();
        const consultations = await Consultation_1.Consultation.find({}).populate('user', 'fullName email').sort({ createdAt: -1 }).lean();
        const workbook = new exceljs_1.default.Workbook();
        // Sheet 1: All Users
        const userSheet = workbook.addWorksheet('All Users');
        userSheet.views = [{ showGridLines: true }];
        userSheet.columns = [
            { header: 'User ID', key: '_id', width: 25 },
            { header: 'Full Name', key: 'fullName', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Email Verified', key: 'isEmailVerified', width: 15 },
            { header: 'Created Date', key: 'createdAt', width: 20 },
        ];
        users.forEach((u) => {
            userSheet.addRow({
                _id: u._id.toString(),
                fullName: u.fullName || 'N/A',
                email: u.email,
                phone: u.phone || 'N/A',
                role: u.role || 'user',
                isEmailVerified: u.isEmailVerified ? 'Yes' : 'No',
                createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : 'N/A',
            });
        });
        userSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        userSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
        // Sheet 2: Consultation Requests
        const consultationSheet = workbook.addWorksheet('Consultations');
        consultationSheet.views = [{ showGridLines: true }];
        consultationSheet.columns = [
            { header: 'Request ID', key: '_id', width: 25 },
            { header: 'Client Name', key: 'clientName', width: 25 },
            { header: 'Client Email', key: 'clientEmail', width: 30 },
            { header: 'Service', key: 'service', width: 25 },
            { header: 'Requirement Type', key: 'requirementType', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Submitted On', key: 'createdAt', width: 22 },
        ];
        consultations.forEach((c) => {
            consultationSheet.addRow({
                _id: c._id.toString(),
                clientName: c.answers?.name || c.user?.fullName || 'N/A',
                clientEmail: c.answers?.email || c.user?.email || 'N/A',
                service: c.answers?.service || 'N/A',
                requirementType: c.answers?.requirementType || 'N/A',
                status: (c.status || 'pending').toUpperCase(),
                createdAt: c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN') : 'N/A',
            });
        });
        consultationSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        consultationSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Pinnacle_Master_Report.xlsx"');
        await workbook.xlsx.write(res);
        res.status(200).end();
    }
    catch (error) {
        console.error('Excel Export Error:', error);
        res.status(500).json({ message: 'Error generating Excel file' });
    }
};
exports.exportAllDataExcel = exportAllDataExcel;
// =============================================================
// 2. MASTER PDF EXPORT (ALL USERS OR SINGLE USER SUMMARY)
// =============================================================
const exportUsersPDF = async (req, res) => {
    try {
        const { userId } = req.query;
        let users = [];
        if (userId) {
            const singleUser = await User_1.User.findById(userId).lean();
            if (!singleUser)
                return res.status(404).json({ message: 'User not found' });
            users = [singleUser];
        }
        else {
            users = await User_1.User.find({}).lean();
        }
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
        const filename = userId && users[0]
            ? formatFileName(users[0].fullName, 'pdf')
            : 'Pinnacle_Users_Report.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);
        // Header Title
        doc.fontSize(20).fillColor('#0F172A').text('PINNACLE LEGAL & TAX REPORT', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#64748B').text(`Generated Date: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
        doc.moveDown(1.5);
        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            doc.fontSize(13).fillColor('#1E40AF').text(`${i + 1}. Client Profile: ${u.fullName || 'N/A'}`);
            doc.moveDown(0.3);
            doc.fontSize(9.5).fillColor('#334155');
            doc.text(`User ID         : ${u._id}`);
            doc.text(`Email Address   : ${u.email}`);
            doc.text(`Phone           : ${u.phone || 'N/A'}`);
            doc.text(`Role            : ${(u.role || 'user').toUpperCase()}`);
            doc.text(`Verified Status : ${u.isEmailVerified ? 'Email Verified' : 'Unverified'}`);
            // Fetch user's consultations sorted by latest first
            const userConsultations = await Consultation_1.Consultation.find({ user: u._id }).sort({ createdAt: -1 }).lean();
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#0F172A').text(`Consultation Requests (${userConsultations.length}):`);
            if (userConsultations.length > 0) {
                userConsultations.forEach((c, cIdx) => {
                    const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : 'N/A';
                    doc.fontSize(8.5).fillColor('#475569').text(` • [${dateStr}] [Status: ${(c.status || 'pending').toUpperCase()}] Service: ${c.answers?.service || 'N/A'} | Income: ${c.answers?.incomeRange || 'N/A'}`);
                });
            }
            else {
                doc.fontSize(8.5).fillColor('#94A3B8').text(' • No consultation requests found.');
            }
            doc.moveDown(1);
            doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#E2E8F0').stroke();
            doc.moveDown(1);
        }
        doc.end();
    }
    catch (error) {
        console.error('PDF Export Error:', error);
        res.status(500).json({ message: 'Error generating PDF report' });
    }
};
exports.exportUsersPDF = exportUsersPDF;
// =============================================================
// 3. INDIVIDUAL CLIENT EXCEL EXPORT (BUNDLE / BUNDLED REQUESTS)
// =============================================================
const exportSingleUserExcel = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Consultations latest pehle aayengi (createdAt: -1)
        const consultations = await Consultation_1.Consultation.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();
        const workbook = new exceljs_1.default.Workbook();
        const sheet = workbook.addWorksheet('Client Dossier');
        sheet.views = [{ showGridLines: true }];
        // Column widths setup
        sheet.columns = [
            { width: 4 }, // Margin Spacing
            { width: 22 }, // Labels / Field Names
            { width: 35 }, // Primary Details
            { width: 20 }, // Status / Secondary Key
            { width: 25 }, // Date / Information
        ];
        // --- SECTION 1: CLIENT PROFILE BUNDLE ---
        const headerRow = sheet.addRow([]);
        const headerCell = sheet.getCell('B2');
        headerCell.value = `CLIENT PROFILE: ${(user.fullName || 'User').toUpperCase()}`;
        headerCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFF' } };
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } }; // Dark Slate
        headerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        sheet.mergeCells('B2:E2');
        sheet.getRow(2).height = 28;
        sheet.addRow([]);
        const profileData = [
            ['Full Name', user.fullName || 'N/A', 'Account Role', (user.role || 'user').toUpperCase()],
            ['Email Address', user.email, 'Email Status', user.isEmailVerified ? 'VERIFIED' : 'PENDING'],
            ['Phone Number', user.phone || 'N/A', 'Joined Date', user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A'],
        ];
        profileData.forEach((r) => {
            const row = sheet.addRow(['', r[0], r[1], r[2], r[3]]);
            row.height = 20;
            row.getCell(2).font = { bold: true, color: { argb: '475569' } };
            row.getCell(4).font = { bold: true, color: { argb: '475569' } };
            row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
            row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        });
        sheet.addRow([]);
        sheet.addRow([]);
        // --- SECTION 2: BUNDLED CONSULTATIONS HISTORY ---
        const secHeaderRow = sheet.addRow([]);
        const secCell = sheet.getCell(`B${secHeaderRow.number}`);
        secCell.value = `CONSULTATION HISTORY (${consultations.length} TOTAL REQUESTS)`;
        secCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } }; // Navy Blue
        sheet.mergeCells(`B${secHeaderRow.number}:E${secHeaderRow.number}`);
        secHeaderRow.height = 24;
        if (consultations.length === 0) {
            sheet.addRow([]);
            const emptyRow = sheet.addRow(['', 'No consultation activity found for this client.']);
            emptyRow.getCell(2).font = { italic: true, color: { argb: '94A3B8' } };
        }
        else {
            consultations.forEach((c, index) => {
                sheet.addRow([]); // Bundle gap
                const statusUpper = (c.status || 'pending').toUpperCase();
                let statusBgColor = 'FEF3C7'; // Yellow (Pending)
                let statusTextColor = '92400E';
                if (statusUpper === 'ACCEPTED' || statusUpper === 'APPROVED') {
                    statusBgColor = 'D1FAE5'; // Green
                    statusTextColor = '065F46';
                }
                else if (statusUpper === 'REJECTED') {
                    statusBgColor = 'FEE2E2'; // Red
                    statusTextColor = '991B1B';
                }
                const dateFormatted = c.createdAt
                    ? new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'N/A';
                // --- BUNDLE HEADER ---
                const reqNumber = consultations.length - index;
                const bundleHeader = sheet.addRow(['', `REQUEST #${reqNumber}`, '', `STATUS: ${statusUpper}`, `DATE: ${dateFormatted}`]);
                bundleHeader.height = 24;
                sheet.mergeCells(`B${bundleHeader.number}:C${bundleHeader.number}`);
                // Title Styling
                const reqTitleCell = bundleHeader.getCell(2);
                reqTitleCell.font = { bold: true, size: 10.5, color: { argb: '0F172A' } };
                reqTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
                // Status Styling
                const statusCell = bundleHeader.getCell(4);
                statusCell.font = { bold: true, size: 9.5, color: { argb: statusTextColor } };
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBgColor } };
                statusCell.alignment = { horizontal: 'center' };
                // Date Styling
                const dateCell = bundleHeader.getCell(5);
                dateCell.font = { bold: true, size: 9, color: { argb: '475569' } };
                dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
                dateCell.alignment = { horizontal: 'right' };
                // --- BUNDLE DETAILS ---
                const details = [
                    ['Request ID', c._id.toString()],
                    ['Service Requested', c.answers?.service || 'N/A'],
                    ['Requirement Type', c.answers?.requirementType || 'N/A'],
                    ['Income Range', c.answers?.incomeRange || 'N/A'],
                ];
                details.forEach(([field, val]) => {
                    const dRow = sheet.addRow(['', field, val, '', '']);
                    dRow.height = 18;
                    sheet.mergeCells(`C${dRow.number}:E${dRow.number}`);
                    dRow.getCell(2).font = { bold: true, size: 9, color: { argb: '64748B' } };
                    dRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
                    dRow.getCell(3).font = { size: 9.5, color: { argb: '1E293B' } };
                });
                // --- ATTACHED DOCUMENTS SUB-SECTION ---
                const docHeaderRow = sheet.addRow(['', 'Submitted Documents', '', '', '']);
                docHeaderRow.height = 18;
                sheet.mergeCells(`C${docHeaderRow.number}:E${docHeaderRow.number}`);
                docHeaderRow.getCell(2).font = { bold: true, size: 9, color: { argb: '1E40AF' } };
                docHeaderRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
                if (c.documents && c.documents.length > 0) {
                    c.documents.forEach((docItem, dIdx) => {
                        const docName = docItem.originalName || docItem.filename || docItem.url || `Document ${dIdx + 1}`;
                        const docRow = sheet.addRow(['', `   File ${dIdx + 1}`, docName, '', '']);
                        docRow.height = 18;
                        sheet.mergeCells(`C${docRow.number}:E${docRow.number}`);
                        docRow.getCell(2).font = { size: 8.5, italic: true, color: { argb: '2563EB' } };
                        docRow.getCell(3).font = { size: 9, color: { argb: '1E293B' } };
                    });
                }
                else {
                    const noDocRow = sheet.addRow(['', '   Files', 'No documents submitted for this request', '', '']);
                    noDocRow.height = 18;
                    sheet.mergeCells(`C${noDocRow.number}:E${noDocRow.number}`);
                    noDocRow.getCell(2).font = { size: 8.5, italic: true, color: { argb: '94A3B8' } };
                    noDocRow.getCell(3).font = { size: 8.5, italic: true, color: { argb: '94A3B8' } };
                }
                // Left & Right Visual Border Box around the bundle
                const startR = bundleHeader.number;
                const endR = sheet.lastRow ? sheet.lastRow.number : startR;
                for (let r = startR; r <= endR; r++) {
                    const currRow = sheet.getRow(r);
                    currRow.getCell(2).border = { ...currRow.getCell(2).border, left: { style: 'medium', color: { argb: '94A3B8' } } };
                    currRow.getCell(5).border = { ...currRow.getCell(5).border, right: { style: 'medium', color: { argb: '94A3B8' } } };
                }
            });
        }
        const filename = formatFileName(user.fullName, 'xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.status(200).end();
    }
    catch (error) {
        console.error('Individual Excel Export Error:', error);
        res.status(500).json({ message: 'Error generating client Excel report' });
    }
};
exports.exportSingleUserExcel = exportSingleUserExcel;
// =============================================================
// 4. INDIVIDUAL CLIENT PDF EXPORT (STRUCTURED BUNDLE DOSSIER)
// =============================================================
const exportSingleUserPDF = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Fetch consultations (latest request first)
        const consultations = await Consultation_1.Consultation.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
        const filename = formatFileName(user.fullName, 'pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);
        // Document Header
        doc.fontSize(18).fillColor('#0F172A').text('PINNACLE CLIENT DOSSIER', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#64748B').text(`Generated Date: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
        doc.moveDown(1.2);
        // User Profile Card Box
        doc.fontSize(12).fillColor('#1E40AF').text(`Client Profile: ${user.fullName || 'N/A'}`);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#1E40AF').stroke();
        doc.moveDown(0.5);
        doc.fontSize(9.5).fillColor('#334155');
        doc.text(`User ID         : ${user._id}`);
        doc.text(`Email Address   : ${user.email}`);
        doc.text(`Phone Number    : ${user.phone || 'N/A'}`);
        doc.text(`Account Role    : ${(user.role || 'user').toUpperCase()}`);
        doc.text(`Verified Status : ${user.isEmailVerified ? 'Verified' : 'Pending'}`);
        doc.text(`Account Joined  : ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A'}`);
        doc.moveDown(1.5);
        // Consultation History
        doc.fontSize(12).fillColor('#1E40AF').text(`Consultation History (${consultations.length} Requests)`);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#1E40AF').stroke();
        doc.moveDown(0.8);
        if (consultations.length === 0) {
            doc.fontSize(9.5).fillColor('#94A3B8').text('No consultation activity found for this client.');
        }
        else {
            consultations.forEach((c, index) => {
                const reqNumber = consultations.length - index;
                const statusUpper = (c.status || 'pending').toUpperCase();
                const dateStr = c.createdAt
                    ? new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'N/A';
                // Draw bundle header box
                const boxStartY = doc.y;
                doc.rect(40, boxStartY, 510, 20).fill('#F1F5F9');
                doc.fillColor('#0F172A').fontSize(9.5).text(` REQUEST #${reqNumber}  |  DATE: ${dateStr}`, 45, boxStartY + 5);
                doc.fillColor('#1E3A8A').fontSize(9.5).text(`STATUS: ${statusUpper}`, 430, boxStartY + 5, { align: 'right' });
                doc.moveDown(0.8);
                doc.fontSize(9).fillColor('#334155');
                doc.text(`   • Request ID      : ${c._id}`);
                doc.text(`   • Service         : ${c.answers?.service || 'N/A'}`);
                doc.text(`   • Requirement     : ${c.answers?.requirementType || 'N/A'}`);
                doc.text(`   • Income Range    : ${c.answers?.incomeRange || 'N/A'}`);
                if (c.documents && c.documents.length > 0) {
                    doc.text(`   • Documents (${c.documents.length}):`);
                    c.documents.forEach((docItem, dIdx) => {
                        const docName = docItem.originalName || docItem.filename || `File ${dIdx + 1}`;
                        doc.fillColor('#2563EB').text(`       - ${docName}`);
                    });
                    doc.fillColor('#334155');
                }
                else {
                    doc.fillColor('#64748B').text(`   • Documents       : None`);
                }
                doc.moveDown(1);
            });
        }
        doc.end();
    }
    catch (error) {
        console.error('Individual PDF Export Error:', error);
        res.status(500).json({ message: 'Error generating client PDF report' });
    }
};
exports.exportSingleUserPDF = exportSingleUserPDF;
