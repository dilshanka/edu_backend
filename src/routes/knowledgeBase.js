const express = require("express");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const KnowledgeBase = require("../models/KnowledgeBase");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const ragService = require("../utils/ragService");

const router = express.Router();

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// GET /api/knowledge-base - List all KB documents
router.get("/", auth, async (req, res) => {
  try {
    const docs = await KnowledgeBase.find().sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/knowledge-base/upload - Upload PDF and index it
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const title = req.body.title || req.file.originalname;
    const filePath = req.file.path;

    const kbDoc = new KnowledgeBase({
      title,
      type: "pdf",
      filename: req.file.originalname,
      fileSize: formatFileSize(req.file.size),
      status: "processing",
    });
    await kbDoc.save();

    // Process async - don't block the response
    processAndIndex(kbDoc._id.toString(), filePath, title).catch((err) => {
      console.error("KB indexing error:", err);
    });

    res.status(201).json(kbDoc);
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error" });
  }
});

// POST /api/knowledge-base/text - Add text content to KB
router.post("/text", auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const kbDoc = new KnowledgeBase({
      title,
      type: "text",
      content,
      status: "processing",
    });
    await kbDoc.save();

    // Process async
    indexTextContent(kbDoc._id.toString(), title, content).catch((err) => {
      console.error("KB text indexing error:", err);
    });

    res.status(201).json(kbDoc);
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error" });
  }
});

// DELETE /api/knowledge-base/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const doc = await KnowledgeBase.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Delete vectors from Pinecone
    try {
      await ragService.deleteDocumentVectors(doc._id.toString());
    } catch (err) {
      console.error("Failed to delete vectors:", err.message);
    }

    await KnowledgeBase.findByIdAndDelete(req.params.id);
    res.json({ message: "Knowledge base document deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/knowledge-base/query - Query the knowledge base
router.post("/query", auth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const context = await ragService.queryKnowledgeBase(question);
    const answer = await ragService.generateRAGResponse(question, context);

    res.json({
      answer,
      sources: context.map((c) => ({
        title: c.title,
        score: c.score,
        text: c.text.substring(0, 200) + "...",
      })),
    });
  } catch (error) {
    console.error("RAG query error:", error);
    res.status(500).json({ message: error.message || "Failed to query knowledge base" });
  }
});

// Helper: process PDF and index
async function processAndIndex(docId, filePath, title) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    const result = await ragService.indexDocument(docId, title, text);

    await KnowledgeBase.findByIdAndUpdate(docId, {
      status: "indexed",
      content: text.substring(0, 1000),
      chunksCount: result.chunksIndexed,
    });

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    await KnowledgeBase.findByIdAndUpdate(docId, {
      status: "failed",
      error: error.message,
    });
  }
}

// Helper: index text content
async function indexTextContent(docId, title, content) {
  try {
    const result = await ragService.indexDocument(docId, title, content);

    await KnowledgeBase.findByIdAndUpdate(docId, {
      status: "indexed",
      chunksCount: result.chunksIndexed,
    });
  } catch (error) {
    await KnowledgeBase.findByIdAndUpdate(docId, {
      status: "failed",
      error: error.message,
    });
  }
}

module.exports = router;
