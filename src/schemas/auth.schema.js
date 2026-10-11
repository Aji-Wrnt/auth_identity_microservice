import { z } from 'zod';

// filterasi dengan zod
// Validasi Password: Min 8 karakter, 1 huruf besar, 1 angka, 1 simbol
const passwordValidation = z.string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung minimal satu huruf besar')
  .regex(/[0-9]/, 'Password harus mengandung minimal satu angka')
  .regex(/[^a-zA-Z0-9]/, 'Password harus mengandung minimal satu karakter khusus');

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid').toLowerCase().trim(),
    password: passwordValidation,
    role: z.enum(['client', 'worker', 'contractor'], {
      errorMap: () => ({ message: 'Role harus berupa client, worker, atau contractor' }),
    }),
    fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(100),
    phoneNumber: z.string().regex(/^[0-9+]{10,15}$/, 'Format nomor telepon tidak valid').optional(),
    // Khusus worker
    specialization: z.string().min(3).max(100).optional(),
    hourlyRate: z.number().positive('Tarif per jam harus lebih dari 0').optional(),
  }).refine((data) => {
    // Edge case: Jika role = worker, wajib sertakan specialization
    if (data.role === 'worker' && !data.specialization) {
      return false;
    }
    return true;
  }, {
    message: 'Spesialisasi wajib diisi untuk worker',
    path: ['specialization'],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid').toLowerCase().trim(),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
});