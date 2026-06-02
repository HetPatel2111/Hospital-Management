import AppError from "../utils/AppError.js";

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (!result.success) {
    const details = result.error.errors.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));

    return next(new AppError("Invalid request payload", 400, "VALIDATION_ERROR", details));
  }

  req.validated = result.data;
  return next();
};

export default validate;
