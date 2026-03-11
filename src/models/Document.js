const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["pdf", "video", "image"] },
    size: { type: String, required: true },
    category: { type: String, default: "General" },
    filename: { type: String, required: true },
    path: { type: String, default: "" },
    // Google Drive fields
    driveFileId: { type: String, default: "" },
    driveViewLink: { type: String, default: "" },
    driveDownloadLink: { type: String, default: "" },
    storage: { type: String, enum: ["local", "google_drive"], default: "local" },
    uploadedAt: { type: String, default: () => new Date().toISOString().split("T")[0] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
