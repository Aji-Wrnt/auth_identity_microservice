import { pool } from '../config/database.js';

export const findUserByEmail = async (email) => {
  const queryText = `
    SELECT id, email, password_hash, role, status, is_verified, created_at
    FROM users
    WHERE email = $1
  `;
  const { rows } = await pool.query(queryText, [email]);
  return rows[0] || null;
};

export const findUserById = async (id) => {
  const queryText = `
    SELECT id, email, role, status, is_verified, created_at
    FROM users
    WHERE id = $1
  `;
  const { rows } = await pool.query(queryText, [id]);
  return rows[0] || null;
};

// Registrasi dengan transaksi atomik
export const createUserWithProfile = async ({ email, passwordHash, role, fullName, phoneNumber, specialization, hourlyRate }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert ke tabel users
    const insertUserQuery = `
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, email, role, status, created_at
    `;
    const userResult = await client.query(insertUserQuery, [email, passwordHash, role]);
    const newUser = userResult.rows[0];

    // 2. Insert ke profil yang sesuai
    if (role === 'worker') {
      const insertWorkerQuery = `
        INSERT INTO worker_profiles (user_id, full_name, phone_number, specialization, hourly_rate)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(insertWorkerQuery, [
        newUser.id,
        fullName,
        phoneNumber || null,
        specialization,
        hourlyRate || 0.00,
      ]);
    } else {
      // Untuk client dan contractor
      const insertClientQuery = `
        INSERT INTO client_profiles (user_id, full_name, phone_number)
        VALUES ($1, $2, $3)
      `;
      await client.query(insertClientQuery, [newUser.id, fullName, phoneNumber || null]);
    }

    await client.query('COMMIT');
    return newUser;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};


// pengambilan data user
export const getUserFullProfile = async (userId, role) => {
  if (role === 'worker') {
    const queryText = `
      SELECT u.id, u.email, u.role, u.status, u.is_verified,
             w.full_name, w.phone_number, w.specialization, w.hourly_rate, 
             w.years_of_experience, w.is_available, u.created_at
      FROM users u
      LEFT JOIN worker_profiles w ON u.id = w.user_id
      WHERE u.id = $1
    `;
    const { rows } = await pool.query(queryText, [userId]);
    return rows[0] || null;
  } else {
    const queryText = `
      SELECT u.id, u.email, u.role, u.status, u.is_verified,
             c.full_name, c.phone_number, c.address, u.created_at
      FROM users u
      LEFT JOIN client_profiles c ON u.id = c.user_id
      WHERE u.id = $1
    `;
    const { rows } = await pool.query(queryText, [userId]);
    return rows[0] || null;
  }
};