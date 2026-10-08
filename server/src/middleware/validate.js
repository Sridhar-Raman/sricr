/** Validates req.body against a zod schema and replaces it with the parsed value. */
export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        });
    }
    req.body = result.data;
    return next();
};

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
