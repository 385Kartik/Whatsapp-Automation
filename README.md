# Numberwale Bot 🤖

This is the WhatsApp automation and AI-powered parser bot for Numberwale. 

## 🚀 Running the Bot (Background & Autostart)

The bot is currently managed using **PM2**, which allows it to run in the background continuously and automatically restart if your PC/server reboots.

### 📌 PM2 Quick Commands Guide

Here are the most important commands you might need based on your use cases. Run these commands in your PowerShell or Terminal.

#### 1. Check Bot Status
If you want to see if the bot is currently running, stopped, or has crashed:
```bash
pm2 status
```

#### 2. View Live Logs
If you want to see what the bot is doing in the background (like reading messages, adding numbers):
```bash
pm2 logs numberwale-bot
```
*(Tip: Press `Ctrl + C` to exit the logs view. Don't worry, exiting logs won't stop the bot.)*

#### 3. Restart the Bot
If you made changes to the code, or if the bot gets stuck/hung and you want to give it a fresh start:
```bash
pm2 restart numberwale-bot
```

#### 4. Stop the Bot Temporarily
If you want to pause the bot for some time so it stops reading and replying to WhatsApp messages:
```bash
pm2 stop numberwale-bot
```
*(To start it again later, just run `pm2 start numberwale-bot`)*

#### 5. Remove from Autostart (Permanent Stop)
If you don't want the bot to run in the background anymore and want to completely remove it from PM2's autostart memory:
```bash
pm2 delete numberwale-bot
pm2 save
```

---

## ⚙️ Initial PM2 Setup (For New PC/Server)
*(Note: This is already done on the current system, but keep this for reference if you move to a new PC)*

1. Install PM2 and Windows Startup tools globally:
```bash
npm install -g pm2
npm install -g pm2-windows-startup
```
2. Link PM2 to Windows startup registry:
```bash
pm2-startup install
```
3. Start the bot and save the process list:
```bash
pm2 start src/index.js --name "numberwale-bot"
pm2 save
```

---

## 🐧 VPS / Linux Server Setup (Ubuntu, CentOS, etc.)
Agar aap is bot ko kisi VPS (Linux Server) par host karte ho, toh autostart set karne ka tareeqa thoda alag (aur zyada aasan) hota hai:

1. PM2 ko globally install karein:
```bash
npm install -g pm2
```
2. Bot ko start karein:
```bash
pm2 start src/index.js --name "numberwale-bot"
```
3. Linux ke boot system mein PM2 ko add karne ke liye ye command run karein:
```bash
pm2 startup
```
*(Yeh command run karne par terminal aapko ek aur command dega jo `sudo env PATH...` se start hogi. Aapko wo command copy karke paste karni hai aur enter dabana hai.)*
4. Process list ko save karein:
```bash
pm2 save
```
