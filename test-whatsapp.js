/**
 * WhatsApp AI Agent Test Script
 * 
 * This script tests the WhatsApp API endpoints
 * Make sure the server is running before executing this script
 */

const baseURL = "http://localhost:5000/api";
const token = "YOUR_JWT_TOKEN_HERE"; // Replace with actual token

// Helper function to make API calls
async function apiCall(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${baseURL}${endpoint}`, options);
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test functions
async function testStatus() {
  console.log("\n🔍 Testing WhatsApp Status...");
  const result = await apiCall("/whatsapp/status");
  console.log(result);
}

async function testStart() {
  console.log("\n🚀 Starting WhatsApp Client...");
  const result = await apiCall("/whatsapp/start", "POST");
  console.log(result);
}

async function testStop() {
  console.log("\n⛔ Stopping WhatsApp Client...");
  const result = await apiCall("/whatsapp/stop", "POST");
  console.log(result);
}

async function testSendMessage() {
  console.log("\n📤 Sending Test Message...");
  const result = await apiCall("/whatsapp/send", "POST", {
    number: "1234567890", // Replace with actual number
    message: "Hello! This is a test message from EduConnect AI.",
  });
  console.log(result);
}

async function testBroadcast() {
  console.log("\n📡 Broadcasting Message...");
  const result = await apiCall("/whatsapp/broadcast", "POST", {
    message: "This is a broadcast message to all active users!",
  });
  console.log(result);
}

async function testStats() {
  console.log("\n📊 Getting Statistics...");
  const result = await apiCall("/whatsapp/stats");
  console.log(result);
}

async function testClearMemory() {
  console.log("\n🧹 Clearing User Memory...");
  const result = await apiCall("/whatsapp/clear-memory/1234567890@c.us", "POST");
  console.log(result);
}

// Run all tests
async function runAllTests() {
  console.log("=".repeat(50));
  console.log("WhatsApp AI Agent - API Test Suite");
  console.log("=".repeat(50));

  await testStatus();
  // await testStart();
  // await testSendMessage();
  // await testStats();
  // await testBroadcast();
  // await testClearMemory();
  // await testStop();

  console.log("\n" + "=".repeat(50));
  console.log("Tests completed!");
  console.log("=".repeat(50));
}

// Uncomment the test you want to run
// testStatus();
// testStart();
// testStop();
// testSendMessage();
// testStats();
// runAllTests();

module.exports = {
  testStatus,
  testStart,
  testStop,
  testSendMessage,
  testBroadcast,
  testStats,
  testClearMemory,
  runAllTests,
};
