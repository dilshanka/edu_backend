const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

function getAuth() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Google Drive credentials not configured. Set GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY in .env");
  }

  return new google.auth.JWT(clientEmail, null, privateKey, [
    "https://www.googleapis.com/auth/drive.file",
  ]);
}

function getDrive() {
  return google.drive({ version: "v3", auth: getAuth() });
}

/**
 * Upload a file to Google Drive
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Name for the file in Drive
 * @param {string} mimeType - MIME type of the file
 * @returns {Object} { fileId, webViewLink, webContentLink }
 */
async function uploadFile(filePath, fileName, mimeType) {
  const drive = getDrive();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const fileMetadata = {
    name: fileName,
    ...(folderId && { parents: [folderId] }),
  };

  const media = {
    mimeType,
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink, webContentLink",
  });

  // Make the file viewable by anyone with the link
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // Get updated links after permission change
  const file = await drive.files.get({
    fileId: response.data.id,
    fields: "id, webViewLink, webContentLink",
  });

  return {
    fileId: file.data.id,
    webViewLink: file.data.webViewLink,
    webContentLink: file.data.webContentLink,
  };
}

/**
 * Delete a file from Google Drive
 * @param {string} fileId - Google Drive file ID
 */
async function deleteFile(fileId) {
  if (!fileId) return;
  const drive = getDrive();
  await drive.files.delete({ fileId });
}

/**
 * Check if Google Drive is configured
 */
function isConfigured() {
  return !!(
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL &&
    process.env.GOOGLE_DRIVE_PRIVATE_KEY &&
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );
}

module.exports = { uploadFile, deleteFile, isConfigured };
