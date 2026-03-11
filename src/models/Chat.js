const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentName: { type: String, required: true },
    sender: { type: String, required: true, enum: ["ai", "student", "human"] },
    message: { type: String, required: true },
    timestamp: { type: String, default: () => new Date().toISOString() },
    isHandoff: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ studentId: 1, timestamp: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
