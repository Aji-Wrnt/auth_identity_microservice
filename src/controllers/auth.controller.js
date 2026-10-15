// penangah req http. cookie, dan respon json yg standar

import * as authService from '../services/auth.service.js';
import { getUserFullProfile } from '../repositories/user.repository.js';

// Konfigurasi cookie aman untuk Refresh Token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true, // Mencegah akses via JavaScript (Anti-XSS)
  secure: process.env.NODE_ENV === 'production', // Wajib HTTPS saat production
  sameSite: 'strict', // Mencegah CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari dalam milidetik
  path: '/api/v1/auth', // Cookie hanya dikirim ke path auth
};

export const register = async (req, res, next) => {
  try {
    const newUser = await authService.registerUser(req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Registrasi berhasil',
      data: { user: newUser },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    const { accessToken, rawRefreshToken, user } = await authService.loginUser({
      email: req.body.email,
      password: req.body.password,
      userAgent,
      ipAddress,
    });

    // Pasang Refresh Token ke HTTP-Only Cookie
    res.cookie('refreshToken', rawRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      status: 'success',
      message: 'Login berhasil',
      data: {
        accessToken,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    const { accessToken, rawRefreshToken: newRawRefreshToken } = await authService.rotateRefreshToken({
      rawRefreshToken,
      userAgent,
      ipAddress,
    });

    // Update cookie dengan refresh token baru hasil rotasi
    res.cookie('refreshToken', newRawRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      status: 'success',
      message: 'Token berhasil diperbarui',
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    await authService.logoutUser(rawRefreshToken);

    // Hapus cookie di browser
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      status: 'success',
      message: 'Logout berhasil',
    });
  } catch (error) {
    next(error);
  }
};


// get profille user
export const getMe = async (req, res, next) => {
  try {
    const profile = await getUserFullProfile(req.user.id, req.user.role);
    if (!profile) {
      return res.status(404).json({
        status: 'fail',
        message: 'Profil tidak ditemukan',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

// forgto pass
export const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.requestPasswordReset(req.body.email);
    return res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword({
      token: req.body.token,
      newPassword: req.body.newPassword,
    });
    return res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};