import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  delay,
  makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";
import pino from "pino";
import readline from "readline";
import config from "./config.js";
import main from "./main.js";

/* ========= CONSTANTS ========= */
const SESSION_PATH = "./Botsession";
const UPDATE_INTERVAL_MS = 60000; // تحديث الحالة كل دقيقة بدلاً من كل ثانية
const OWNER_JID = config.ownerNumber ? `${config.ownerNumber}@s.whatsapp.net` : null;

/* ========= LOGGER CONFIGURATION ========= */
const logger = pino({ level: "silent" });

/* ========= UTILITY FUNCTIONS ========= */
class Terminal {
  static async question(text) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise(resolve => {
      rl.question(text, answer => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}

class TimeFormatter {
  static formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${remainingSeconds}s`);
    
    return parts.join(" ");
  }
  
  static getCurrentUptime(startTime) {
    return Date.now() - startTime;
  }
}

/* ========= BOT CONFIGURATION ========= */
class BotConfig {
  static getSocketConfig(state) {
    return {
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      browser: Browsers.macOS("Chrome"),
      markOnlineOnConnect: true
    };
  }
}

/* ========= BOT CORE ========= */
class WhatsAppBot {
  constructor() {
    this.startTime = Date.now();
    this.socket = null;
    this.uptimeInterval = null;
  }

  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
      this.socket = makeWASocket(BotConfig.getSocketConfig(state));
      
      this.setupEventHandlers(saveCreds);
      await this.handlePairing(state);
      
      return this.socket;
    } catch (error) {
      console.error("❌ Failed to initialize bot:", error);
      throw error;
    }
  }

  async handlePairing(state) {
    if (!state.creds.registered && config.pairingCode) {
      const phone = await Terminal.question("📱 Enter phone number (2126xxxxxxx): ");
      await delay(2000);
      
      try {
        const code = await this.socket.requestPairingCode(phone);
        console.log("✅ PAIRING CODE:", code);
      } catch (error) {
        console.error("❌ Failed to get pairing code:", error.message);
      }
    }
  }

  setupEventHandlers(saveCreds) {
    this.socket.ev.on("connection.update", this.handleConnectionUpdate.bind(this));
    this.socket.ev.on("creds.update", saveCreds);
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect } = update;
    
    if (connection === "close") {
      this.cleanup();
      await this.handleDisconnect(lastDisconnect);
    }
    
    if (connection === "open") {
      await this.handleConnectionOpen();
    }
  }

  async handleDisconnect(lastDisconnect) {
    const shouldReconnect = 
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    
    if (shouldReconnect) {
      console.log("🔄 Attempting to reconnect...");
      await delay(5000);
      await this.restart();
    } else {
      console.log("❌ Bot logged out. Manual restart required.");
    }
  }

  async handleConnectionOpen() {
    console.log("✅ BOT ONLINE");
    
    this.startUptimeUpdater();
    await this.notifyOwner();
    await this.loadCommands();
  }

  startUptimeUpdater() {
    this.uptimeInterval = setInterval(async () => {
      if (!this.socket?.user) return;
      
      try {
        const uptime = TimeFormatter.formatUptime(
          TimeFormatter.getCurrentUptime(this.startTime)
        );
        
        await this.socket.updateProfileStatus(
          `🤖 ${config.botName || "WhatsApp Bot"}\n⏱ Uptime: ${uptime}`
        );
      } catch (error) {
        // تجاهل الأخطاء في تحديث الحالة
      }
    }, UPDATE_INTERVAL_MS);
  }

  async notifyOwner() {
    if (!OWNER_JID) return;
    
    try {
      await this.socket.sendMessage(OWNER_JID, {
        text: "✅ البوت خدام دابا بنجاح 🤖"
      });
    } catch (error) {
      console.warn("⚠️ Could not notify owner:", error.message);
    }
  }

  async loadCommands() {
    try {
      await main(this.socket);
      console.log("📦 Commands loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load commands:", error);
    }
  }

  cleanup() {
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = null;
    }
  }

  async restart() {
    this.cleanup();
    await this.initialize();
  }
}

/* ========= APPLICATION ENTRY POINT ========= */
async function startApplication() {
  console.log("🚀 Starting WhatsApp Bot...");
  
  try {
    const bot = new WhatsAppBot();
    await bot.initialize();
    
    // معالجة إغلاق التطبيق
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down bot...");
      bot.cleanup();
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      console.log("\n🛑 Terminating bot...");
      bot.cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    console.error("💥 Failed to start application:", error);
    process.exit(1);
  }
}

/* ========= RUN APPLICATION ========= */
startApplication();
