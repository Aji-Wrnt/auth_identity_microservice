// bisnis rule

import { findUserByEmail, findUserById, createUserWithProfile } from '../repositories/user.repository.js';
import { createSession, findValidSessionByHash, revokeSessionById, revokeAllUserSessions } from '../repositories/session.repository.js';
import { hashPassword, verifyPassword, hashToken } from '../utils/hash.util.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.util.js';
import { createPasswordResetToken, findValidResetToken, markResetTokenAsUsed } from '../repositories/passwordReset.repository.js';
import { updateUserPassword } from '../repositories/user.repository.js';
import { pool } from '../config/database.js';
import crypto from 'crypto';

export const registerUser = async (data) => {
  // 1. Cek apakah email sudah terdaftar
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    const error = new Error('Email sudah digunakan');
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash password dengan Argon2id
  const passwordHash = await hashPassword(data.password);

  // 3. Simpan user + profile via database transaction
  const newUser = await createUserWithProfile({
    email: data.email,
    passwordHash,
    role: data.role,
    fullName: data.fullName,
    phoneNumber: data.phoneNumber,
    specialization: data.specialization,
    hourlyRate: data.hourlyRate,
  });

  return newUser;
};

export const loginUser = async ({ email, password, userAgent, ipAddress }) => {
  // 1. Cari user berdasarkan email
  const user = await findUserByEmail(email);
  if (!user) {
    const error = new Error('Kredensial tidak valid');
    error.statusCode = 401;
    throw error;
  }

  // 2. Cek status akun
  if (user.status !== 'active') {
    const error = new Error('Akun Anda sedang dinonaktifkan atau ditangguhkan');
    error.statusCode = 403;
    throw error;
  }

  // 3. Verifikasi password hash Argon2id
  const isMatch = await verifyPassword(user.password_hash, password);
  if (!isMatch) {
    const error = new Error('Kredensial tidak valid');
    error.statusCode = 401;
    throw error;
  }

  // 4. Buat Access Token (RS256 JWT)
  const accessToken = generateAccessToken(user);

  // 5. Buat Refresh Token (Opaque Token berdurasi 7 hari)
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 6. Simpan session baru ke database
  await createSession({
    userId: user.id,
    tokenHash: refreshTokenHash,
    userAgent,
    ipAddress,
    expiresAt,
  });

  return {
    accessToken,
    rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
};

export const rotateRefreshToken = async ({ rawRefreshToken, userAgent, ipAddress }) => {
  if (!rawRefreshToken) {
    const error = new Error('Refresh token diperlukan');
    error.statusCode = 401;
    throw error;
  }

  // 1. Cari session valid berdasarkan SHA-256 hash dari token masuk
  const incomingHash = hashToken(rawRefreshToken);
  const session = await findValidSessionByHash(incomingHash);

  if (!session) {
    const error = new Error('Sesi tidak valid atau telah kedaluwarsa');
    error.statusCode = 401;
    throw error;
  }

  // 2. Revoke sesi yang sedang dipakai (Single-Use Token Rotation)
  await revokeSessionById(session.id);

  // 3. Ambil data user terkait
  const user = await findUserById(session.user_id);
  if (!user || user.status !== 'active') {
    const error = new Error('User tidak ditemukan atau tidak aktif');
    error.statusCode = 403;
    throw error;
  }

  // 4. Terbitkan access token baru dan refresh token baru
  const newAccessToken = generateAccessToken(user);
  const newRawRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 5. Simpan sesi baru
  await createSession({
    userId: user.id,
    tokenHash: newHash,
    userAgent,
    ipAddress,
    expiresAt,
  });

  return {
    accessToken: newAccessToken,
    rawRefreshToken: newRawRefreshToken,
  };
};

export const logoutUser = async (rawRefreshToken) => {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  const session = await findValidSessionByHash(tokenHash);
  if (session) {
    await revokeSessionById(session.id);
  }
};


export const requestPasswordReset = async (email) => {
  const user = await findUserByEmail(email);
  // Proteksi keamanan: jangan beri tahu apakah email terdaftar atau tidak (mencegah user enumeration)
  if (!user || user.status !== 'active') {
    return { message: 'Jika email terdaftar, instruksi reset password telah dikirim.' };
  }

  // Buat random raw token aman
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Kadaluwarsa dalam 15 menit

  await createPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  // Catatan: Di production, rawToken dikirim via email service (Sendgrid/Resend).
  // Untuk keperluan local testing, kita cetak langsung ke log terminal.
  console.log(`\n[DEV] Token Reset Password untuk ${email}:`);
  console.log(`token: ${rawToken}\n`);

  return { message: 'Jika email terdaftar, instruksi reset password telah dikirim.' };
};

export const resetPassword = async ({ token, newPassword }) => {
  const tokenHash = hashToken(token);
  const resetSession = await findValidResetToken(tokenHash);

  if (!resetSession) {
    const error = new Error('Token reset password tidak valid atau sudah kedaluwarsa');
    error.statusCode = 400;
    throw error;
  }

  const newPasswordHash = await hashPassword(newPassword);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Update password baru
    await updateUserPassword(resetSession.user_id, newPasswordHash, client);

    // 2. Tandai token sudah terpakai
    await markResetTokenAsUsed(resetSession.id, client);

    // 3. Cabut semua sesi login aktif akun ini (Force Logout di semua device)
    await revokeAllUserSessions(resetSession.user_id);

    await client.query('COMMIT');
    return { message: 'Password berhasil diubah. Silakan login kembali dengan password baru.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};