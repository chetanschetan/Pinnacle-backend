import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

// Extending the Request interface to include the user object
interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  // 1. Get token from the 'jwt' cookie
  token = req.cookies.jwt;

  if (token) {
    try {
      // 2. Verify the token using your Secret Key
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

      // 3. Find the user in DB and attach to req (excluding password for security)
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next(); // Move to the next controller/middleware
    } catch (error) {
      console.error("Token Verification Error:", error);
      res.status(401).json({ message: 'Not authorized, token invalid' });
    }
  } else {
    // 4. No token found
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Middleware to restrict access to Admins only
export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admins only' });
  }
};