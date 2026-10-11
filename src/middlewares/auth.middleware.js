import { verifyAccessToken } from '../utils/token.util.js';

// 1. Verifikasi JWT Access Token
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'fail',
      message: 'Akses ditolak. Token autentikasi tidak ditemukan.',
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({
      status: 'fail',
      message: 'Token tidak valid atau telah kedaluwarsa.',
    });
  }

  // Simpan data token ke request object
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };

  next();
};

// 2. Role-Based Access Control (RBAC) Guard
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'Akses terlarang. Anda tidak memiliki izin untuk resource ini.',
      });
    }
    next();
  };
};