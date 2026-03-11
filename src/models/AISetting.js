const mongoose = require("mongoose");

const aiSettingSchema = new mongoose.Schema(
  {
    systemPrompt: {
      type: String,
      default:
        "You are an educational assistant for our coaching institute. Help parents and students with course inquiries, schedules, and payment information. Be polite, professional, and helpful. If you cannot answer a question, escalate to a human agent.",
    },
    model: { type: String, default: "GPT-4o" },
    temperature: { type: Number, default: 0.7, min: 0, max: 2 },
    autoReply: { type: Boolean, default: true },
    welcomeMessage: { type: Boolean, default: true },
    shareDocuments: { type: Boolean, default: false },
    autoEscalatePayment: { type: Boolean, default: true },
    escalateAfterFailedAttempts: { type: Boolean, default: true },
    notifyAdminOnHandoff: { type: Boolean, default: true },
    // RAG Configuration
    geminiApiKey: { type: String, default: "" },
    pineconeApiKey: { type: String, default: "" },
    pineconeIndexName: { type: String, default: "educonnect-kb" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AISetting", aiSettingSchema);
