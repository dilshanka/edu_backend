const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const whatsappAIService = require("./whatsappAIService");

let whatsappClient = null;
let isInitialized = false;
let isReady = false;


function initializeWhatsAppClient() {
  if (whatsappClient) {
    console.log("WhatsApp client already initialized");
    return whatsappClient;
  }

  const getExecutablePath = () => {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
    if (process.platform === "linux") return "/usr/bin/google-chrome-stable";
    return null; 
  };

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: "./whatsapp-session", // මෙය "whatsapp-session" ලෙස තිබේදැයි බලන්න
    }),
    puppeteer: {
      headless: process.env.NODE_ENV === 'production' ? true : false, 
      executablePath: getExecutablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--remote-debugging-port=9222",
      ],
      authTimeoutMs: 60000, 
      qrMaxRetries: 5, // මෙතැන කොමාව අනිවාර්යයි
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
    },
    // බ්‍රවුසරය වහාම වැසීම වැළැක්වීමට මෙම පේළිය එක් කරන්න
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
  });

  setupEventHandlers();
  isInitialized = true;
  return whatsappClient;
}

// Setup event handlers
// function setupEventHandlers() {
//   // QR Code event
//   whatsappClient.on("qr", (qr) => {
//     console.log("\n🔐 Scan this QR code with WhatsApp:");
//     qrcode.generate(qr, { small: true });
//     console.log("\n📱 Open WhatsApp > Linked Devices > Link a Device");
//   });

//   // Ready event
//   whatsappClient.on("ready", () => {
//     console.log("✅ WhatsApp AI Agent is ready!");
//     isReady = true;
//   });

//   // Authentication events
//   whatsappClient.on("authenticated", () => {
//     console.log("✅ WhatsApp authenticated successfully");
//   });

//   whatsappClient.on("auth_failure", (msg) => {
//     console.error("❌ WhatsApp authentication failed:", msg);
//     isReady = false;
//   });

//   // Disconnected event
//   whatsappClient.on("disconnected", (reason) => {
//     console.log("⚠️ WhatsApp client disconnected:", reason);
//     isReady = false;
//   });

//   // Message event - Handle incoming messages
//   whatsappClient.on("message", async (message) => {
//     try {
//       // Ignore group messages (optional - remove this if you want group support)
//       const chat = await message.getChat();
//       if (chat.isGroup) {
//         return;
//       }

//       // Ignore messages from self
//       if (message.fromMe) {
//         return;
//       }

//       // Get contact info
//       const contact = await message.getContact();
//       const userName = contact.pushname || contact.number;

//       console.log(`📩 Message from ${userName}: ${message.body}`);

//       // Show typing indicator
//       chat.sendStateTyping();

//       // Process message with AI
//       const response = await whatsappAIService.processMessage(
//         message.body,
//         message.from,
//         userName
//       );

//       // Clear typing indicator
//       chat.clearState();

//       // Send response
//       await message.reply(response);

//       console.log(`✅ Reply sent to ${userName}`);
//     } catch (error) {
//       console.error("Error handling message:", error);
//       try {
//         await message.reply(
//           "Sorry, I encountered an error processing your message. Please try again."
//         );
//       } catch (replyError) {
//         console.error("Error sending error message:", replyError);
//       }
//     }
//   });

//   // Message creation event (for debugging)
//   whatsappClient.on("message_create", (message) => {
//     if (message.fromMe) {
//       console.log(`📤 Bot sent: ${message.body}`);
//     }
//   });

//   // Loading screen event
//   whatsappClient.on("loading_screen", (percent, message) => {
//     console.log(`⏳ Loading WhatsApp... ${percent}% - ${message}`);
//   });
// }

function setupEventHandlers() {
  // QR Code event - මෙතැනදී අපි URL එකක් ලෙස QR එක පෙන්වමු
  whatsappClient.on("qr", (qr) => {
    console.log("\n🔐 QR CODE RECEIVED!");

    // 1. Terminal එකේ QR එක පෙන්වීමට උත්සාහ කරයි (සමහර විට Railway වල නොපෙනේ)
    qrcode.generate(qr, { small: true });

    // 2. මෙම ලින්ක් එක Railway Logs වල පෙනේවි. එය කොපි කර බ්‍රවුසරයේ විවෘත කරන්න.
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    console.log("\n📱 SCAN THE QR CODE HERE:");
    console.log(qrUrl);
    console.log("\n📱 Open WhatsApp > Linked Devices > Link a Device\n");
  });

  // Ready event
  whatsappClient.on("ready", () => {
    console.log("✅ WhatsApp AI Agent is ready!");
    isReady = true;
  });

  // Authentication events
  whatsappClient.on("authenticated", () => {
    console.log("✅ WhatsApp authenticated successfully");
  });

  whatsappClient.on("auth_failure", (msg) => {
    console.error("❌ WhatsApp authentication failed:", msg);
    isReady = false;
  });

  // Disconnected event
  whatsappClient.on("disconnected", (reason) => {
    console.log("⚠️ WhatsApp client disconnected:", reason);
    isReady = false;
  });

  // Message event - Handle incoming messages
  whatsappClient.on("message", async (message) => {
    try {
      const chat = await message.getChat();
      if (chat.isGroup || message.fromMe) return;

      const contact = await message.getContact();
      const userName = contact.pushname || contact.number;

      console.log(`📩 Message from ${userName}: ${message.body}`);

      chat.sendStateTyping();

      // AI එක හරහා පිළිතුර සකසයි
      const response = await whatsappAIService.processMessage(
        message.body,
        message.from,
        userName,
      );

      chat.clearState();
      await message.reply(response);

      console.log(`✅ Reply sent to ${userName}`);
    } catch (error) {
      console.error("Error handling message:", error);
      try {
        await message.reply("පද්ධතියේ දෝෂයක් පවතී. කරුණාකර පසුව උත්සාහ කරන්න.");
      } catch (replyError) {
        console.error("Error sending error message:", replyError);
      }
    }
  });

  // Loading screen event
  whatsappClient.on("loading_screen", (percent, message) => {
    console.log(`⏳ Loading WhatsApp... ${percent}% - ${message}`);
  });
}

// Start WhatsApp client
async function startWhatsAppClient() {
  try {
    if (!isInitialized) {
      initializeWhatsAppClient();
    }

    if (!isReady) {
      console.log("🚀 Starting WhatsApp client...");
      await whatsappClient.initialize();
    } else {
      console.log("WhatsApp client is already running");
    }

    return { success: true, message: "WhatsApp client started successfully" };
  } catch (error) {
    console.error("Error starting WhatsApp client:", error);
    throw error;
  }
}

// Stop WhatsApp client
async function stopWhatsAppClient() {
  try {
    if (whatsappClient && isReady) {
      await whatsappClient.destroy();
      whatsappClient = null;
      isInitialized = false;
      isReady = false;
      console.log("⛔ WhatsApp client stopped");
      return { success: true, message: "WhatsApp client stopped successfully" };
    }
    return { success: true, message: "WhatsApp client was not running" };
  } catch (error) {
    console.error("Error stopping WhatsApp client:", error);
    throw error;
  }
}

// Get client status
function getClientStatus() {
  return {
    initialized: isInitialized,
    ready: isReady,
    connected: whatsappClient ? whatsappClient.info : null,
  };
}

// Get WhatsApp client instance
function getClient() {
  return whatsappClient;
}

// Send message to a specific number
async function sendMessage(number, message) {
  try {
    if (!isReady) {
      throw new Error("WhatsApp client is not ready");
    }

    // Format number to WhatsApp format (with country code)
    const formattedNumber = number.includes("@c.us")
      ? number
      : `${number}@c.us`;

    await whatsappClient.sendMessage(formattedNumber, message);

    return { success: true, message: "Message sent successfully" };
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

module.exports = {
  initializeWhatsAppClient,
  startWhatsAppClient,
  stopWhatsAppClient,
  getClientStatus,
  getClient,
  sendMessage,
};
