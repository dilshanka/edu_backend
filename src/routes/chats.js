const express = require("express");
const { body, validationResult } = require("express-validator");
const ChatMessage = require("../models/Chat");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/chats/conversations - get all conversations grouped by student
router.get("/conversations", auth, async (req, res) => {
  try {
    const { hasHandoff } = req.query;

    const pipeline = [
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$studentId",
          studentName: { $first: "$studentName" },
          lastMessage: { $first: "$message" },
          lastTimestamp: { $first: "$timestamp" },
          hasHandoff: { $max: { $cond: ["$isHandoff", true, false] } },
          messageCount: { $sum: 1 },
        },
      },
      { $sort: { lastTimestamp: -1 } },
    ];

    if (hasHandoff === "true") {
      pipeline.push({ $match: { hasHandoff: true } });
    }

    const conversations = await ChatMessage.aggregate(pipeline);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/chats/conversations/:studentId - get messages for a student
router.get("/conversations/:studentId", auth, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ studentId: req.params.studentId }).sort({
      timestamp: 1,
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/chats/conversations/:studentId/messages - send a message
router.post(
  "/conversations/:studentId/messages",
  auth,
  [body("message").trim().notEmpty().withMessage("Message is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      // Get student name from latest message
      const latest = await ChatMessage.findOne({ studentId: req.params.studentId }).sort({
        timestamp: -1,
      });

      const chatMessage = new ChatMessage({
        studentId: req.params.studentId,
        studentName: latest?.studentName || "Unknown",
        sender: req.body.sender || "human",
        message: req.body.message,
        timestamp: new Date().toISOString(),
        isHandoff: false,
      });
      await chatMessage.save();

      res.status(201).json(chatMessage);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PUT /api/chats/conversations/:studentId/takeover - mark as taken over by human
router.put("/conversations/:studentId/takeover", auth, async (req, res) => {
  try {
    const result = await ChatMessage.updateMany(
      { studentId: req.params.studentId, isHandoff: true },
      { isHandoff: false }
    );
    res.json({ message: "Conversation taken over", modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
