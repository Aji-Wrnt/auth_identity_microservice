// middle ware validator

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Ganti payload dengan data yang sudah disanitasi oleh Zod
    req.body = parsed.body;
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validasi input gagal',
      errors: error.errors.map((err) => ({
        field: err.path.join('.').replace('body.', ''),
        message: err.message,
      })),
    });
  }
};