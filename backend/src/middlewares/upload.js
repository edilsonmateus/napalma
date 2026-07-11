import multer from "multer";

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    fieldSize: 64 * 1024,
    files: 1,
    fields: 20,
    parts: 25
  }
});
