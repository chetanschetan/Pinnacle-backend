import nodemailer from 'nodemailer';

interface MailOptions {
  email: string;
  subject: string;
  otp: string;
}

export const sendOTP = async ({ email, subject, otp }: MailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const htmlTemplate = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 16px;">
      <h2 style="color: #1e3a8a; text-align: center;">Pinnacle Accounting Services</h2>
      <p style="text-align: center; color: #475569;">Your secure verification code is below. This code will expire in 10 minutes.</p>
      <div style="margin: 30px 0; text-align: center; background: #f8fafc; padding: 20px; border-radius: 12px;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1e3a8a;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not request this, please secure your account immediately.</p>
    </div>
  `;

  await transporter.sendMail({
    from: '"Pinnacle Support" <noreply@pinnacle.com>',
    to: email,
    subject: subject,
    html: htmlTemplate,
  });
};