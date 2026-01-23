/* ========= IMPORTS ========= */
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  delay,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import fs from "fs-extra";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";

/* ========= CONFIGURATION ========= */
import config from "./config.js";

/* ========= UTILITY FUNCTIONS ========= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Logger {
  static success(message) {
    console.log(chalk.green(`✓ ${message}`));
  }
  
  static info(message) {
    console.log(chalk.blue(`ℹ ${message}`));
  }
  
  static warning(message) {
    console.log(chalk.yellow(`⚠ ${message}`));
  }
  
  static error(message) {
    console.log(chalk.red(`✗ ${message}`));
  }
  
  static bot(message) {
    console.log(chalk.cyan(`🤖 ${message}`));
  }
}

class TimeUtils {
  static formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    
    return parts.join(" ");
  }
  
  static getTimestamp() {
    return new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }
}

/* ========= BOT CORE CLASS ========= */
class WhatsAppBot {
  constructor() {
    this.startTime = Date.now();
    this.socket = null;
    this.state = null;
    this.saveCreds = null;
    this.intervals = new Set();
    this.isConnected = false;
  }

  async initialize() {
    try {
      Logger.bot("Initializing WhatsApp Bot...");
      
      // Create necessary directories
      await this.createDirectories();
      
      // Load or create auth state
      await this.loadAuthState();
      
      // Create socket connection
      await this.createSocket();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      Logger.success("Bot initialized successfully");
      return this.socket;
    } catch (error) {
      Logger.error(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  async createDirectories() {
    const directories = [
      "./Botsession",
      "./plugins",
      "./temp",
      "./media",
      "./logs"
    ];
    
    for (const dir of directories) {
      try {
        await fs.ensureDir(dir);
        Logger.info(`Created directory: ${dir}`);
      } catch (error) {
        Logger.warning(`Could not create ${dir}: ${error.message}`);
      }
    }
  }

  async loadAuthState() {
    try {
      const authState = await useMultiFileAuthState("./Botsession");
      this.state = authState.state;
      this.saveCreds = authState.saveCreds;
      Logger.success("Auth state loaded");
    } catch (error) {
      Logger.error(`Failed to load auth state: ${error.message}`);
      throw error;
    }
  }

  async createSocket() {
    try {
      const { version } = await fetchLatestBaileysVersion();
      
      this.socket = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
          creds: this.state.creds,
          keys: makeCacheableSignalKeyStore(this.state.keys, pino({ level: "silent" }))
        },
        browser: Browsers.macOS("Chrome"),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
        emitOwnEvents: true,
        defaultQueryTimeoutMs: 60000
      });
      
      Logger.success("Socket created successfully");
    } catch (error) {
      Logger.error(`Failed to create socket: ${error.message}`);
      throw error;
    }
  }

  setupEventHandlers() {
    // Connection events
    this.socket.ev.on("connection.update", this.handleConnectionUpdate.bind(this));
    this.socket.ev.on("creds.update", this.saveCreds);
    
    // Message events
    this.socket.ev.on("messages.upsert", this.handleMessages.bind(this));
    
    // Presence events
    this.socket.ev.on("presence.update", this.handlePresence.bind(this));
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrcode.generate(qr, { small: true });
      Logger.info("Scan QR code above to login");
    }
    
    if (connection === "open") {
      this.isConnected = true;
      await this.onConnected();
    }
    
    if (connection === "close") {
      this.isConnected = false;
      await this.onDisconnected(lastDisconnect);
    }
  }

  async onConnected() {
    Logger.success("Connected to WhatsApp!");
    
    // Clear console and show bot info
    console.clear();
    this.displayBotInfo();
    
    // Start background tasks
    this.startBackgroundTasks();
    
    // Notify owner
    await this.notifyOwner();
    
    // Load plugins
    await this.loadPlugins();
  }

  displayBotInfo() {
    console.log(chalk.bold.cyan("╔══════════════════════════════════════╗"));
    console.log(chalk.bold.cyan("║      WHATSAPP BOT - ONLINE          ║"));
    console.log(chalk.bold.cyan("╠══════════════════════════════════════╣"));
    console.log(chalk.bold.cyan(`║ 👤 User: ${this.socket.user?.name || "Unknown"}`));
    console.log(chalk.bold.cyan(`║ 📞 JID: ${this.socket.user?.id || "Unknown"}`));
    console.log(chalk.bold.cyan(`║ 🚀 Prefix: ${config.prefix || "."}`));
    console.log(chalk.bold.cyan(`║ ⏰ Started: ${new Date().toLocaleString()}`));
    console.log(chalk.bold.cyan("╚══════════════════════════════════════╝"));
  }

  startBackgroundTasks() {
    // Uptime updater
    const uptimeInterval = setInterval(async () => {
      if (this.socket?.user) {
        const uptime = TimeUtils.formatUptime(Date.now() - this.startTime);
        try {
          await this.socket.updateProfileStatus(
            `🤖 ${config.botName || "WhatsApp Bot"}\n⏱ Uptime: ${uptime}`
          );
        } catch (error) {
          // Silent fail
        }
      }
    }, 60000);
    
    this.intervals.add(uptimeInterval);
    
    // Auto-reconnect checker
    const reconnectInterval = setInterval(() => {
      if (!this.isConnected) {
        Logger.warning("Connection lost, attempting to reconnect...");
        this.reconnect();
      }
    }, 10000);
    
    this.intervals.add(reconnectInterval);
  }

  async notifyOwner() {
    if (!config.ownerNumber) return;
    
    const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;
    const uptime = TimeUtils.formatUptime(Date.now() - this.startTime);
    
    try {
      await this.socket.sendMessage(ownerJid, {
        text: `✅ البوت اشتغل بنجاح!\n\n` +
              `🕐 وقت التشغيل: ${uptime}\n` +
              `👤 البوت: ${this.socket.user?.name || "Unknown"}\n` +
              `⚙️ الإصدار: v${process.env.npm_package_version || "1.0.0"}\n` +
              `🚀 جاهز للاستخدام!`
      });
      Logger.success("Owner notified");
    } catch (error) {
      Logger.warning("Could not notify owner");
    }
  }

  async loadPlugins() {
    try {
      const { default: loadPlugins } = await import("./main.js");
      await loadPlugins(this.socket);
      Logger.success("Plugins loaded successfully");
    } catch (error) {
      Logger.error(`Failed to load plugins: ${error.message}`);
    }
  }

  async onDisconnected(lastDisconnect) {
    Logger.warning("Disconnected from WhatsApp");
    
    // Clean up intervals
    this.cleanupIntervals();
    
    const shouldReconnect = 
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    
    if (shouldReconnect) {
      Logger.info("Attempting to reconnect in 5 seconds...");
      await delay(5000);
      await this.reconnect();
    } else {
      Logger.error("Logged out. Please scan QR code again.");
      process.exit(0);
    }
  }

  async reconnect() {
    try {
      Logger.info("Reconnecting...");
      await this.initialize();
    } catch (error) {
      Logger.error(`Reconnection failed: ${error.message}`);
    }
  }

  async handleMessages({ messages }) {
    // This will be handled by the main plugin system
    // You can add global message handlers here if needed
  }

  async handlePresence(update) {
    // Handle presence updates if needed
  }

  cleanupIntervals() {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  async shutdown() {
    Logger.info("Shutting down bot...");
    
    this.cleanupIntervals();
    
    if (this.socket) {
      try {
        await this.socket.end();
      } catch (error) {
        // Ignore errors during shutdown
      }
    }
    
    Logger.success("Bot shutdown complete");
  }
}

/* ========= APPLICATION ENTRY POINT ========= */
async function startBot() {
  const bot = new WhatsAppBot();
  
  // Handle process termination
  process.on("SIGINT", async () => {
    Logger.warning("\nReceived SIGINT, shutting down gracefully...");
    await bot.shutdown();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    Logger.warning("\nReceived SIGTERM, shutting down gracefully...");
    await bot.shutdown();
    process.exit(0);
  });
  
  process.on("uncaughtException", (error) => {
    Logger.error(`Uncaught Exception: ${error.message}`);
    console.error(error.stack);
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  });
  
  try {
    await bot.initialize();
  } catch (error) {
    Logger.error(`Failed to start bot: ${error.message}`);
    process.exit(1);
  }
}

/* ========= START THE BOT ========= */
startBot();
