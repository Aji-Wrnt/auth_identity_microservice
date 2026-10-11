// utility token -> agar tidak perlu request saat berulang di service lain 
// jika mmerlukan validasi

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { privateKey, publicKey } from '../config/keys.js';

export const generateAccessToken = (user) => {
  const payload = {
    sub: user.id, // Subject (User UUID)
    email: user.email,
    role: user.role,
    iss: 'tukang-iam-service' // Issuer
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
  });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'tukang-iam-service'
    });
  } catch (error) {
    return null; // Return null jika token expired atau invalid signature
  }
};

export const generateRefreshToken = () => {
  // Generate string acak 64-byte (128 karakter hex)
  return crypto.randomBytes(64).toString('hex');
};