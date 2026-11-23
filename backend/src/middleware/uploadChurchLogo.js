import multer from "multer";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return callback(
        new Error("Only JPEG, PNG, and WebP profile photos are allowed.")
      );
    }

    callback(null, true);
  },
});

export function uploadChurchLogoFile(req, res, next) {
  upload.single("logo")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "The profile photo cannot exceed 5 MB."
            : error.message,
      });
    }

    next();
  });
}
