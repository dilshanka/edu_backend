const mongoose = require("mongoose");

const knowledgeBaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["pdf", "text"], required: true },
    content: { type: String, default: "" },
    filename: { type: String, default: "" },
    chunksCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "indexed", "failed"],
      default: "pending",
    },
    error: { type: String, default: "" },
    fileSize: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KnowledgeBase", knowledgeBaseSchema);
