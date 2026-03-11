const express = require("express");
const whatsappService = require("../services/whatsappService");
const whatsappAIService = require("../services/whatsappAIService");
const auth = require("../middleware/auth");

const router = express.Router();

// POST /api/whatsapp/start - Start WhatsApp client (Admin only)
router.post("/start", auth, async (req, res) => {
  try {
    const result = await whatsappService.startWhatsAppClient();
    res.json(result);
  } catch (error) {
    console.error("Error starting WhatsApp:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start WhatsApp client",
      error: error.message,
    });
  }
});

// POST /api/whatsapp/stop - Stop WhatsApp client (Admin only)
router.post("/stop", auth, async (req, res) => {
  try {
    const result = await whatsappService.stopWhatsAppClient();
    res.json(result);
  } catch (error) {
    console.error("Error stopping WhatsApp:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop WhatsApp client",
      error: error.message,
    });
  }
});

// GET /api/whatsapp/status - Get WhatsApp client status
router.get("/status", auth, async (req, res) => {
  try {
    const status = whatsappService.getClientStatus();
    const stats = whatsappAIService.getConversationStats();
    res.json({
      ...status,
      conversations: stats,
    });
  } catch (error) {
    console.error("Error getting status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get WhatsApp status",
      error: error.message,
    });
  }
});

// POST /api/whatsapp/send - Send message to a specific number (Admin only)
router.post("/send", auth, async (req, res) => {
  try {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({
        success: false,
        message: "Number and message are required",
      });
    }

    const result = await whatsappService.sendMessage(number, message);
    res.json(result);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
});

// POST /api/whatsapp/broadcast - Broadcast message to all active users (Admin only)
router.post("/broadcast", auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const results = await whatsappAIService.broadcastMessage(message);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Broadcast sent to ${successCount} users, ${failureCount} failed`,
      results,
    });
  } catch (error) {
    console.error("Error broadcasting message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to broadcast message",
      error: error.message,
    });
  }
});

// POST /api/whatsapp/clear-memory/:userId - Clear conversation memory for a user (Admin only)
router.post("/clear-memory/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = whatsappAIService.clearConversationMemory(userId);
    res.json(result);
  } catch (error) {
    console.error("Error clearing memory:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear conversation memory",
      error: error.message,
    });
  }
});

// GET /api/whatsapp/stats - Get conversation statistics (Admin only)
router.get("/stats", auth, async (req, res) => {
  try {
    const stats = whatsappAIService.getConversationStats();
    res.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get conversation statistics",
      error: error.message,
    });
  }
});

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Railway Variables වල ඇති WHATSAPP_VERIFY_TOKEN සමඟ පරීක්ෂා කිරීම
  if (mode && token) {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("✅ Webhook Verified Successfully!");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Webhook Verification Failed: Token Mismatch");
      return res.sendStatus(403);
    }
  }
});

// POST /api/whatsapp/webhook - Webhook for external WhatsApp API (if needed)
router.post("/webhook", async (req, res) => {
  try {
    // This endpoint can be used with WhatsApp Business API webhooks
    // For whatsapp-web.js, we use event listeners instead
    const { from, body } = req.body;

    if (!from || !body) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook payload",
      });
    }

    // Process the message
    const response = await whatsappAIService.processMessage(body, from);

    // Send response back
    await whatsappService.sendMessage(from, response);

    res.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process webhook",
      error: error.message,
    });
  }
});

// GET /api/whatsapp/test - Test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "WhatsApp API is working!",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
