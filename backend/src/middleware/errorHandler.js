export function errorHandler(error, req, res, next) {
  const message = error.message || "Internal server error.";

  const statusCode =
    error.statusCode ||
    (error.code === "23514" ? 409 :
    message.includes("already registered") ? 409 :
    message.includes("Invalid") ? 401 :
     message.includes("disabled") ? 403 :
     500);

  if (statusCode >= 500) {
    console.error(error);
  } else {
    console.warn(
      `${req.method} ${req.originalUrl} -> ${statusCode}: ${message}`
    );
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}
