import dotenv from 'dotenv';
import app from './app.js';
import { pool } from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    // Tes ping koneksi ke database PostgreSQL
    const client = await pool.connect();
    console.log('Berhasil terhubung ke PostgreSQL Database (tukang_auth_db)');
    client.release(); // Kembalikan client ke pool

    app.listen(PORT, () => {
      console.log(`IAM Microservice aktif di port http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Gagal terhubung ke database:', error.message);
    process.exit(1);
  }
}

startServer();