require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

// Route imports
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const categoryRoutes = require("./routes/categories");
const documentRoutes = require("./routes/documents");
const chatRoutes = require("./routes/chats");
const aiSettingsRoutes = require("./routes/aiSettings");
const dashboardRoutes = require("./routes/dashboard");
const knowledgeBaseRoutes = require("./routes/knowledgeBase");
const whatsappRoutes = require("./routes/whatsapp");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", process.env.UPLOAD_DIR || "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/ai-settings", aiSettingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/knowledge-base", knowledgeBaseRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  res.status(500).json({ message: "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`EduConnect Backend running on port ${PORT}`);
  
  // Auto-start WhatsApp client if enabled
  if (process.env.WHATSAPP_AUTO_START === "true") {
    console.log("🚀 Auto-starting WhatsApp client...");
    const whatsappService = require("./services/whatsappService");
    const whatsappAIService = require("./services/whatsappAIService");
    
    // Initialize LangChain components
    whatsappAIService.initializeLangChain()
      .then(() => {
        console.log("✅ LangChain initialized");
        // Start WhatsApp client
        return whatsappService.startWhatsAppClient();
      })
      .then(() => {
        console.log("✅ WhatsApp AI Agent started successfully");
      })
      .catch((error) => {
        console.error("❌ Failed to start WhatsApp AI Agent:", error.message);
        console.log("💡 You can start it manually via API: POST /api/whatsapp/start");
      });
  }
});
