const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Pinecone } = require("@pinecone-database/pinecone");
const AISetting = require("../models/AISetting");

let genAI = null;
let pinecone = null;
let embeddingModel = null;

async function getSettings() {
  const settings = await AISetting.findOne();
  if (!settings) throw new Error("AI settings not configured");
  return settings;
}

async function initGemini(apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
}


async function initPinecone(apiKey) {
  pinecone = new Pinecone({ apiKey });
}

async function getEmbedding(text) {
  const settings = await getSettings();
  if (!genAI || !embeddingModel) {
    await initGemini(settings.geminiApiKey);
  }

  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function getPineconeIndex() {
  const settings = await getSettings();
  if (!pinecone) {
    await initPinecone(settings.pineconeApiKey);
  }
  return pinecone.index(settings.pineconeIndexName);
}

function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

async function indexDocument(documentId, title, text) {
  const chunks = chunkText(text);
  const index = await getPineconeIndex();

  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i]);
    vectors.push({
      id: `${documentId}_chunk_${i}`,
      values: embedding,
      metadata: {
        documentId,
        title,
        chunkIndex: i,
        text: chunks[i],
      },
    });
  }

  // Upsert in batches of 100
  for (let i = 0; i < vectors.length; i += 100) {
    const batch = vectors.slice(i, i + 100);
    await index.upsert(batch);
  }

  return { chunksIndexed: chunks.length };
}

async function deleteDocumentVectors(documentId) {
  const index = await getPineconeIndex();

  // Delete all chunks for this document using prefix filter
  // Pinecone supports delete by ID prefix in some configurations
  // Fallback: query and delete
  try {
    const queryResult = await index.query({
      vector: new Array(768).fill(0),
      topK: 1000,
      filter: { documentId: { $eq: documentId } },
    });

    if (queryResult.matches && queryResult.matches.length > 0) {
      const ids = queryResult.matches.map((m) => m.id);
      await index.deleteMany(ids);
    }
  } catch (err) {
    console.error("Error deleting vectors:", err.message);
  }
}

async function queryKnowledgeBase(question, topK = 5) {
  const queryEmbedding = await getEmbedding(question);
  const index = await getPineconeIndex();

  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  return results.matches.map((match) => ({
    score: match.score,
    text: match.metadata.text,
    title: match.metadata.title,
    documentId: match.metadata.documentId,
    chunkIndex: match.metadata.chunkIndex,
  }));
}

async function generateRAGResponse(question, context, systemPrompt) {
  const settings = await getSettings();
  if (!genAI) {
    await initGemini(settings.geminiApiKey);
  }

  const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const contextText = context
    .map((c) => `[From: ${c.title}]\n${c.text}`)
    .join("\n\n---\n\n");

  const prompt = `${systemPrompt || settings.systemPrompt}

Use the following knowledge base context to answer the question. If the context doesn't contain relevant information, say so politely and answer based on your general knowledge.

KNOWLEDGE BASE CONTEXT:
${contextText}

QUESTION: ${question}

Provide a helpful, concise answer:`;

  const result = await chatModel.generateContent(prompt);
  return result.response.text();
}

function resetClients() {
  genAI = null;
  pinecone = null;
  embeddingModel = null;
}

module.exports = {
  getEmbedding,
  indexDocument,
  deleteDocumentVectors,
  queryKnowledgeBase,
  generateRAGResponse,
  chunkText,
  resetClients,
};
