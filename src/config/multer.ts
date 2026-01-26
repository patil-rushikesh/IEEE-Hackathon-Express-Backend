import multer from "multer"
import path from "path"

const storage = multer.diskStorage({
  destination: "uploads/school-ids",
  filename: (_req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueName + path.extname(file.originalname))
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    // Only validate files, not other form fields
    if (file.fieldname.startsWith("schoolIdPdf_")) {
      if (file.mimetype !== "application/pdf") {
        cb(new Error("Only PDF files allowed"))
      } else {
        cb(null, true)
      }
    } else {
      // Accept non-file fields
      cb(null, true)
    }
  },
})
