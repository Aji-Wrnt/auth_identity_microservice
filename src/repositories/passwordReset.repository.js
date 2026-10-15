import { pool } from '../config/database.js';

export const createPasswordResetToken = async ({ userId, tokenHash, expiresAt }) => {
  const queryText = `
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, user_id, expires_at
  `;
  const { rows } = await pool.query(queryText, [userId, tokenHash, expiresAt]);
  return rows[0];
};

export const findValidResetToken = async (tokenHash) => {
  const queryText = `
    SELECT id, user_id, is_used, expires_at
    FROM password_reset_tokens
    WHERE token_hash = $1
      AND is_used = FALSE
      AND expires_at > CURRENT_TIMESTAMP
  `;
  const { rows } = await pool.query(queryText, [tokenHash]);
  return rows[0] || null;
};

export const markResetTokenAsUsed = async (tokenId, client) => {
  const queryText = `
    UPDATE password_reset_tokens
    SET is_used = TRUE
    WHERE id = $1
  `;
  const db = client || pool;
  await db.query(queryText, [tokenId]);
};