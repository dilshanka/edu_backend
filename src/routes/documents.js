const express = require("express");
const fs = require("fs");
const path = require("path");
const Document = require("../models/Document");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const googleDrive = require("../utils/googleDrive");

const router = express.Router();

const getFileType = (mimetype) => {
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("image/")) return "image";
  return "pdf";
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// GET /api/documents
router.get("/", auth, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) filter.category = category;

    const documents = await Document.find(filter).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/documents/upload
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileName = req.body.name || req.file.originalname;
    const fileType = getFileType(req.file.mimetype);
    const fileSize = formatFileSize(req.file.size);
    const localPath = req.file.path;

    let docData = {
      name: fileName,
      type: fileType,
      size: fileSize,
      category: req.body.category || "General",
      filename: req.file.filename,
      path: localPath,
      storage: "local",
      uploadedAt: new Date().toISOString().split("T")[0],
    };

    // Upload to Google Drive if configured
    if (googleDrive.isConfigured()) {
      try {
        const driveResult = await googleDrive.uploadFile(
          localPath,
          fileName,
          req.file.mimetype
        );

        docData.driveFileId = driveResult.fileId;
        docData.driveViewLink = driveResult.webViewLink;
        docData.driveDownloadLink = driveResult.webContentLink;
        docData.storage = "google_drive";

        // Remove local file after successful upload to Drive
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        docData.path = "";
      } catch (driveError) {
        console.error("Google Drive upload failed, keeping local file:", driveError.message);
        // Falls back to local storage - file stays on disk
      }
    }

    const doc = new Document(docData);
    await doc.save();

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error" });
  }
});

// DELETE /api/documents/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Delete from Google Drive if stored there
    if (doc.storage === "google_drive" && doc.driveFileId) {
      try {
        await googleDrive.deleteFile(doc.driveFileId);
      } catch (driveError) {
        console.error("Failed to delete from Google Drive:", driveError.message);
      }
    }

    // Delete local file if exists
    if (doc.path) {
      const filePath = path.resolve(doc.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
