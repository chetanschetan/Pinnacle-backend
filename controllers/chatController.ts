import { Message } from '../models/Message';
import { User } from '../models/User'; // Ensure this matches your export style
import { sendChatNotificationEmail } from '../utils/emailService';

export const sendMessage = async (req: any, res: any) => {
  const { receiverId, content } = req.body;
  const senderId = req.user._id;

  try {
    // 1. Save to Database
    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content
    });

    // 2. Fetch receiver for Email Alert
    // We cast to 'any' or your IUser interface to avoid TS property errors
    const receiver: any = await User.findById(receiverId);
    
    if (receiver && receiver.email) {
      try {
        // We use req.user.fullName (from your auth middleware)
        await sendChatNotificationEmail(
          receiver.email, 
          req.user.fullName || "A Pinnacle User", 
          content
        );
        console.log(`📩 Chat notification sent to ${receiver.email}`);
      } catch (emailErr) {
        // We log the error but DON'T crash the response 
        // because the message WAS saved to the DB successfully.
        console.error("📧 Email Notification Failed:", emailErr);
      }
    }

    res.status(201).json(newMessage);
  } catch (error: any) {
    console.error("💬 Chat Error:", error);
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

export const getAdminId = async (req: any, res: any) => {
  try {
    const admin = await User.findOne({ role: 'admin' });
    res.json({ adminId: admin?._id });
  } catch (err) {
    res.status(500).send("Error");
  }
};

export const getAdminInfo = async (req: any, res: any) => {
  try {
    const admin = await User.findOne({ role: 'admin' }).select('_id fullName');
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.status(200).json(admin);
  } catch (error) {
    return res.status(500).json({ message: "Could not find admin" });
  }
};

export const getChatHistory = async (req: any, res: any) => {
  try {
    const { otherId } = req.params;
    const userId = req.user._id;

    const history = await Message.find({
      $or: [
        { sender: userId, receiver: otherId },
        { sender: otherId, receiver: userId }
      ]
    })
    .populate('sender', 'fullName') // Pulls the name for the label
    .sort({ createdAt: 1 })
    .lean();

    const formatted = history.map(m => ({
      senderId: String(m.sender._id || m.sender), // This is the ID we use for the "isMe" check
      senderName: (m.sender as any).fullName || "Unknown",
      content: m.content,
      createdAt: m.createdAt
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};