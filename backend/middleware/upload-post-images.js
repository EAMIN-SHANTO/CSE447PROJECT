import fs from "node:fs";
import path from "node:path";
import crypto from "crypto";
import multer from "multer";

const uploadDir = path.resolve(process.cwd(), "uploads/posts");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 8 ? ext : ".jpg";
    const id = crypto.randomBytes(12).toString("hex");
    cb(null, `${Date.now()}-${id}${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 3,
    fileSize: 5 * 1024 * 1024,
  },
});

export const uploadPostImages = (req, res, next) => {
  upload.array("images", 3)(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: "Maximum 3 images are allowed" });
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Each image must be <= 5MB" });
    }

    return res.status(400).json({ message: error.message || "Invalid image upload" });
  });
};
