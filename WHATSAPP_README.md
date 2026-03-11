# WhatsApp AI Agent - Setup Guide

## 📱 Overview

The WhatsApp AI Agent integrates with EduConnect Backend to provide intelligent conversational AI through WhatsApp. It uses:
- **WhatsApp Web.js** for WhatsApp integration
- **LangChain** for AI orchestration
- **Google Gemini 1.5 Flash** for natural language understanding
- **Pinecone** for vector-based knowledge retrieval

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=educonnect

# WhatsApp Auto-Start (optional)
WHATSAPP_AUTO_START=false
```

### 3. Start the Server

```bash
npm run dev
```

### 4. Start WhatsApp Client

**Option A: Auto-Start (Recommended for production)**

Set in `.env`:
```env
WHATSAPP_AUTO_START=true
```

Then restart the server. A QR code will appear in the terminal.

**Option B: Manual Start (via API)**

```bash
POST http://localhost:5000/api/whatsapp/start
Authorization: Bearer YOUR_JWT_TOKEN
```

### 5. Scan QR Code

1. Open WhatsApp on your phone
2. Go to **Settings** > **Linked Devices**
3. Tap **Link a Device**
4. Scan the QR code displayed in the terminal

## 📡 API Endpoints

### WhatsApp Management

#### Start WhatsApp Client
```http
POST /api/whatsapp/start
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Stop WhatsApp Client
```http
POST /api/whatsapp/stop
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get Status
```http
GET /api/whatsapp/status
Authorization: Bearer YOUR_JWT_TOKEN
```

Response:
```json
{
  "initialized": true,
  "ready": true,
  "connected": {
    "wid": "...",
    "pushname": "..."
  },
  "conversations": {
    "activeConversations": 5,
    "users": ["1234567890@c.us", ...]
  }
}
```

### Messaging

#### Send Direct Message
```http
POST /api/whatsapp/send
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "number": "1234567890",
  "message": "Hello from EduConnect!"
}
```

#### Broadcast Message
```http
POST /api/whatsapp/broadcast
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "message": "Important announcement for all users!"
}
```

### Conversation Management

#### Clear User Memory
```http
POST /api/whatsapp/clear-memory/:userId
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get Statistics
```http
GET /api/whatsapp/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

## 💬 User Commands

Users can send these commands via WhatsApp:

- `/start` or `/help` - Show welcome message and available commands
- `/clear` or `/reset` - Clear conversation history
- Any other message - Get AI-powered response

## 🧠 How It Works

1. **Message Reception**: User sends a message via WhatsApp
2. **Context Retrieval**: System queries Pinecone vector database for relevant knowledge
3. **Memory Loading**: Retrieves conversation history for the user
4. **AI Processing**: LangChain orchestrates Gemini 1.5 Flash with context and memory
5. **Response Generation**: AI generates contextual response
6. **Memory Update**: Conversation is saved for future context
7. **Reply**: Response is sent back to user via WhatsApp

## 🔧 Configuration

### Conversation Memory

Each user has an independent conversation memory stored in-memory. Memory persists until:
- Server restart
- User sends `/clear` or `/reset` command
- Admin clears via API

### Knowledge Base Integration

The AI automatically searches the knowledge base (documents uploaded via the admin panel) using semantic search through Pinecone.

### System Prompt Customization

The system prompt is loaded from AI Settings in the database. You can customize it via the admin panel at `/api/ai-settings`.

## 📁 File Structure

```
src/
├── services/
│   ├── whatsappService.js      # WhatsApp client management
│   └── whatsappAIService.js    # AI message processing
├── routes/
│   └── whatsapp.js             # API endpoints
└── utils/
    └── ragService.js           # RAG and embeddings
```

## 🐛 Troubleshooting

### QR Code Not Showing

- Ensure `whatsapp-web.js` is properly installed
- Check that no other instance is running
- Clear `whatsapp-session` folder and restart

### Authentication Failed

- Delete `whatsapp-session` folder
- Restart the server
- Scan QR code again

### Messages Not Being Received

- Check WhatsApp client status: `GET /api/whatsapp/status`
- Verify WhatsApp client is ready: `ready: true`
- Check server logs for errors

### AI Not Responding

- Verify Gemini API key is valid
- Check Pinecone configuration
- Ensure AI settings are configured in the database
- Review server logs for errors

## 🔐 Security Notes

- **Authentication**: All admin endpoints require JWT authentication
- **Session Storage**: WhatsApp session is stored locally in `whatsapp-session/`
- **Environment Variables**: Never commit `.env` file to version control
- **API Keys**: Keep Gemini and Pinecone API keys secure

## 📱 Production Deployment

For production deployment:

1. Set `WHATSAPP_AUTO_START=true` in production environment
2. Use a process manager (PM2, Docker) to ensure auto-restart on crashes
3. Set up monitoring for WhatsApp connection status
4. Implement rate limiting on API endpoints
5. Use HTTPS for all API communications
6. Regular backup of `whatsapp-session` folder

### PM2 Example

```bash
pm2 start src/server.js --name "educonnect-backend"
pm2 save
pm2 startup
```

## 🆘 Support

For issues or questions, check:
- Server logs: `npm run dev`
- WhatsApp status: `GET /api/whatsapp/status`
- Database AI settings: Ensure configured properly

## 📚 Resources

- [WhatsApp Web.js Documentation](https://wwebjs.dev/)
- [LangChain Documentation](https://js.langchain.com/)
- [Google Gemini API](https://ai.google.dev/)
- [Pinecone Documentation](https://docs.pinecone.io/)
