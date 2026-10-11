import argon2 from 'argon2';
import crypto from 'crypto';

// Hashing password dengan Argon2id
export const hashPassword = async (password) => {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB memori
    timeCost: 3,         // 3 iterasi
    parallelism: 1,
  });
};

// Verifikasi password plain text dengan hash tersimpan
export const verifyPassword = async (hash, password) => {
  return await argon2.verify(hash, password);
};

// Hash satu arah SHA-256 untuk Refresh Token & Reset Token
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};