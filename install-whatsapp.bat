@echo off
echo ========================================
echo WhatsApp AI Agent - Installation
echo ========================================
echo.

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Creating .env file (if not exists)...
if not exist .env (
    copy .env.example .env
    echo Created .env file. Please update with your API keys!
) else (
    echo .env file already exists.
)

echo.
echo [3/3] Installation complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Update .env file with your API keys:
echo    - GEMINI_API_KEY
echo    - PINECONE_API_KEY
echo    - PINECONE_INDEX_NAME
echo.
echo 2. Start the server:
echo    npm run dev
echo.
echo 3. Start WhatsApp (choose one):
echo    a) Auto-start: Set WHATSAPP_AUTO_START=true in .env
echo    b) Manual: POST http://localhost:5000/api/whatsapp/start
echo.
echo 4. Scan QR code with WhatsApp
echo.
echo ========================================
echo Documentation:
echo    - SETUP_GUIDE_SINHALA.md (Sinhala guide)
echo    - WHATSAPP_README.md (Full documentation)
echo ========================================
echo.
pause
