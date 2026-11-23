
import multer from "multer";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    if (
      !IMAGE_TYPES.has(file.mimetype) &&
      !VIDEO_TYPES.has(file.mimetype)
    ) {
      return callback(
        new Error("Only JPEG, PNG, WebP, GIF, MP4, WebM and MOV files are allowed.")
      );
    }

    callback(null, true);
  },
});

export function uploadPostMedia(req, res, next) {
  upload.array("media", 10)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === "LIMIT_FILE_SIZE"
          ? "A media file exceeds the 100 MB upload limit."
          : error.message,
      });
    }

    const files = req.files || [];

    const oversizedImage = files.find(
      (file) =>
        file.mimetype.startsWith("image/") &&
        file.size > 10 * 1024 * 1024
    );

    if (oversizedImage) {
      return res.status(400).json({
        success: false,
        message: "Images cannot exceed 10 MB each.",
      });
    }

    next();
  });
}
