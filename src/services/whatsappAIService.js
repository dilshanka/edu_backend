const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { Pinecone } = require("@pinecone-database/pinecone");
const { PineconeStore } = require("@langchain/pinecone");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { ConversationChain } = require("langchain/chains");
const { BufferMemory } = require("langchain/memory");
const { PromptTemplate } = require("@langchain/core/prompts");
const ragService = require("../utils/ragService");
const AISetting = require("../models/AISetting");

// Store conversation memories for each user
const conversationMemories = new Map();

// LangChain components
let llm = null;
let embeddings = null;
let pineconeStore = null;

// Initialize LangChain components
async function initializeLangChain() {
  try {
    const settings = await AISetting.findOne();
    if (!settings) {
      throw new Error("AI settings not configured. Please configure AI settings first.");
    }

    // Initialize Gemini LLM
    llm = new ChatGoogleGenerativeAI({
      apiKey: settings.geminiApiKey,
      model: "gemini-1.5-flash",
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    // Initialize embeddings
    embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: settings.geminiApiKey,
      modelName: "embedding-001",
      apiVersion: "v1",
    });

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: settings.pineconeApiKey,
    });

    const pineconeIndex = pinecone.Index(settings.pineconeIndexName);

    // Initialize Pinecone vector store
    pineconeStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace: "educonnect",
    });

    console.log("✅ LangChain components initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Error initializing LangChain:", error);
    throw error;
  }
}

// Get or create conversation memory for a user
function getConversationMemory(userId) {
  if (!conversationMemories.has(userId)) {
    const memory = new BufferMemory({
      returnMessages: true,
      memoryKey: "chat_history",
      inputKey: "input",
      outputKey: "output",
    });
    conversationMemories.set(userId, memory);
  }
  return conversationMemories.get(userId);
}

// Clear conversation memory for a user
function clearConversationMemory(userId) {
  conversationMemories.delete(userId);
  return { success: true, message: "Conversation memory cleared" };
}

// Process incoming WhatsApp message
async function processMessage(messageText, userId, userName = "User") {
  try {
    // Initialize if not already done
    if (!llm || !embeddings || !pineconeStore) {
      await initializeLangChain();
    }

    // Handle special commands
    const lowerMessage = messageText.toLowerCase().trim();

    if (lowerMessage === "/start" || lowerMessage === "/help") {
      return getWelcomeMessage(userName);
    }

    if (lowerMessage === "/clear" || lowerMessage === "/reset") {
      clearConversationMemory(userId);
      return "✅ Your conversation history has been cleared. Let's start fresh!";
    }

    // Query knowledge base for relevant context
    console.log(`🔍 Searching knowledge base for: ${messageText}`);
    const relevantDocs = await ragService.queryKnowledgeBase(messageText, 3);

    // Build context from relevant documents
    let context = "";
    if (relevantDocs && relevantDocs.length > 0) {
      context = relevantDocs
        .map((doc) => `[${doc.title}]\n${doc.text}`)
        .join("\n\n---\n\n");
      console.log(`📚 Found ${relevantDocs.length} relevant documents`);
    } else {
      console.log("📚 No relevant documents found in knowledge base");
    }

    // Get conversation memory
    const memory = getConversationMemory(userId);

    // Create prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`You are an intelligent AI assistant for EduConnect, an educational platform. Your name is EduConnect AI.

You are helpful, friendly, and knowledgeable. Answer questions based on the knowledge base when available, and use your general knowledge when needed.

{context}

Current conversation:
{chat_history}

User: {input}
AI Assistant:`);

    // Create conversation chain
    const chain = new ConversationChain({
      llm: llm,
      memory: memory,
      prompt: promptTemplate,
    });

    // Generate response
    const response = await chain.call({
      input: messageText,
      context: context
        ? `\nKNOWLEDGE BASE CONTEXT:\n${context}\n`
        : "\nNo specific knowledge base context available for this query.\n",
    });

    console.log(`✅ Generated response for ${userName}`);
    return response.response || response.output || response;
  } catch (error) {
    console.error("❌ Error processing message:", error);

    // Fallback to direct RAG if LangChain fails
    try {
      const relevantDocs = await ragService.queryKnowledgeBase(messageText, 3);
      const response = await ragService.generateRAGResponse(
        messageText,
        relevantDocs,
        "You are an intelligent AI assistant for EduConnect. Be helpful and friendly."
      );
      return response;
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }
}

// Get welcome message
function getWelcomeMessage(userName) {
  return `👋 Hello ${userName}! Welcome to *EduConnect AI Assistant*!

I'm here to help you with:
📚 Educational content and learning materials
❓ Questions about courses and curriculum
📝 Study guidance and resources
💡 General educational support

*Available Commands:*
• /help - Show this help message
• /clear - Clear conversation history
• /start - Restart conversation

Just send me your question and I'll do my best to help! 😊`;
}

// Get conversation statistics
function getConversationStats() {
  return {
    activeConversations: conversationMemories.size,
    users: Array.from(conversationMemories.keys()),
  };
}

// Broadcast message to all active users (admin feature)
async function broadcastMessage(message) {
  const whatsappService = require("./whatsappService");
  const results = [];

  for (const userId of conversationMemories.keys()) {
    try {
      await whatsappService.sendMessage(userId, message);
      results.push({ userId, success: true });
    } catch (error) {
      results.push({ userId, success: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  initializeLangChain,
  processMessage,
  getConversationMemory,
  clearConversationMemory,
  getWelcomeMessage,
  getConversationStats,
  broadcastMessage,
};
