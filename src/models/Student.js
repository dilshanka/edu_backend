const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subject: { type: String, required: true, trim: true },
    language: { type: String, required: true, trim: true },
    enrollmentMonth: { type: String, required: true },
    firstClassDate: { type: String, required: true },
    nextPaymentDate: { type: String, required: true },
    lastInteraction: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

studentSchema.index({ name: "text", phone: "text" }, { language_override: "searchLanguage" });

module.exports = mongoose.model("Student", studentSchema);
