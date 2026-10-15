// menyimpan hashing token utils

import { pool } from '../config/database.js';

export const createSession = async ({ userId, tokenHash, userAgent, ipAddress, expiresAt }) => {
  const queryText = `
    INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, expires_at, created_at
  `;
  const { rows } = await pool.query(queryText, [
    userId,
    tokenHash,
    userAgent || null,
    ipAddress || null,
    expiresAt
  ]);
  return rows[0];
};

export const findValidSessionByHash = async (tokenHash) => {
  const queryText = `
    SELECT id, user_id, is_revoked, expires_at
    FROM auth_sessions
    WHERE refresh_token_hash = $1
      AND is_revoked = FALSE
      AND expires_at > CURRENT_TIMESTAMP
  `;
  const { rows } = await pool.query(queryText, [tokenHash]);
  return rows[0] || null;
};

// Cabut satu sesi tertentu (misal saat logout atau rotasi)
export const revokeSessionById = async (sessionId) => {
  const queryText = `
    UPDATE auth_sessions
    SET is_revoked = TRUE
    WHERE id = $1
  `;
  await pool.query(queryText, [sessionId]);
};

// Cabut seluruh sesi user (misal saat reset password atau indikasi pembobolan akun)
export const revokeAllUserSessions = async (userId, client) => {
  const queryText = `
    UPDATE auth_sessions
    SET is_revoked = TRUE
    WHERE user_id = $1
  `;
  const db = client || pool;
  await db.query(queryText, [userId]);
};