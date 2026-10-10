import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Inisialisasi Connection Pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'tukang_auth_db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  max: 20, // Maksimal 20 koneksi aktif bersamaan
  idleTimeoutMillis: 30000, // Tutup koneksi yang nganggur setelah 30 detik
  connectionTimeoutMillis: 2000, // Timeout jika koneksi gagal dalam 2 detik
});

// Helper untuk query standar dengan logging terpusat
export const query = (text, params) => pool.query(text, params);