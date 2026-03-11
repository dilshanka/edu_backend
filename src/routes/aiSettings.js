const express = require("express");
const AISetting = require("../models/AISetting");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/ai-settings
router.get("/", auth, async (req, res) => {
  try {
    let settings = await AISetting.findOne();
    if (!settings) {
      settings = await AISetting.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/ai-settings
router.put("/", auth, async (req, res) => {
  try {
    const allowedFields = [
      "systemPrompt",
      "model",
      "temperature",
      "autoReply",
      "welcomeMessage",
      "shareDocuments",
      "autoEscalatePayment",
      "escalateAfterFailedAttempts",
      "notifyAdminOnHandoff",
      "geminiApiKey",
      "pineconeApiKey",
      "pineconeIndexName",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    let settings = await AISetting.findOne();
    if (!settings) {
      settings = await AISetting.create(updates);
    } else {
      settings = await AISetting.findByIdAndUpdate(settings._id, updates, { new: true });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
