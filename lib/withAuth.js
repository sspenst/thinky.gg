import jwt from 'jsonwebtoken';

export default function withAuth(handler) {
  return async (req, res) => {
    const token = req.cookies.token;
  
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized: No token provided',
      });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.userId = decoded.userId;

      return handler(req, res);
    } catch(err) {
      res.status(401).json({
        error: 'Unauthorized: Invalid token',
      });
    }
  };
}
