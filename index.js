/* ============================================
   GHATWA BOT MD - WhatsApp Multi-Device Bot
   Version: 2.0.0
   Author: Ali
   ============================================ */

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
import fs from "fs";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

/* ========= CONFIGURATION ========= */
import config from "./config.js";
import { MessageFormatter } from "./message-formatter.js";

/* ========= CONSTANTS ========= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_PATH = "./Botsession";
const APP_VERSION = "2.0.0";

/* ========= UTILITY FUNCTIONS ========= */
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

/* ========= UTILITY CLASSES ========= */

class Logger {
  static log(level, message, data = null) {
    const timestamp = chalk.gray(`[${new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })}]`);
    
    const levels = {
      success: { symbol: "✓", color: chalk.green, prefix: "SUCCESS" },
      info: { symbol: "ℹ", color: chalk.blue, prefix: "INFO" },
      warn: { symbol: "⚠", color: chalk.yellow, prefix: "WARN" },
      error: { symbol: "✗", color: chalk.red, prefix: "ERROR" },
      bot: { symbol: "🤖", color: chalk.cyan, prefix: "BOT" },
      debug: { symbol: "🔍", color: chalk.magenta, prefix: "DEBUG" }
    };
    
    const levelConfig = levels[level] || levels.info;
    const prefix = levelConfig.color(`${levelConfig.symbol} ${levelConfig.prefix}`);
    
    console.log(`${timestamp} ${prefix}: ${levelConfig.color(message)}`);
    
    if (data) {
      if (typeof data === "object") {
        console.dir(data, { depth: 2, colors: true });
      } else {
        console.log(chalk.gray(`  ↳ ${data}`));
      }
    }
  }
  
  static success(message, data = null) { this.log("success", message, data); }
  static info(message, data = null) { this.log("info", message, data); }
  static warning(message, data = null) { this.log("warn", message, data); }
  static error(message, data = null) { this.log("error", message, data); }
  static bot(message, data = null) { this.log("bot", message, data); }
  static debug(message, data = null) {
    if (process.env.DEBUG === "true") this.log("debug", message, data);
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
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} ثانية`);
    return parts.join(" ");
  }
  
  static getCurrentDate() {
    return new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }
  
  static getCurrentTime() {
    return new Date().toLocaleTimeString("ar-SA", { hour12: true, hour: "2-digit", minute: "2-digit" });
  }
}

class FileManager {
  static async initializeDirectories() {
    const directories = [
      { path: "./Botsession", name: "جلسة البوت" },
      { path: "./plugins", name: "الإضافات" },
      { path: "./temp", name: "الملفات المؤقتة" },
      { path: "./media", name: "الوسائط" },
      { path: "./logs", name: "السجلات" },
      { path: "./database", name: "قاعدة البيانات" },
      { path: "./downloads", name: "التحميلات" }
    ];
    
    for (const dir of directories) {
      if (!fs.existsSync(dir.path)) {
        try {
          fs.mkdirSync(dir.path, { recursive: true });
          Logger.info(`تم إنشاء المجلد: ${dir.name}`, dir.path);
        } catch (error) {
          Logger.warning(`فشل في إنشاء ${dir.name}: ${error.message}`);
        }
      }
    }
  }
  
  static async cleanupTempFiles() {
    const tempDir = "./temp";
    if (!fs.existsSync(tempDir)) return;
    try {
      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > 3600000) {
          fs.unlinkSync(filePath);
          Logger.debug(`تم حذف الملف المؤقت: ${file}`);
        }
      }
    } catch (error) {}
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
    this.formatter = new MessageFormatter();
    this.pluginManager = null;
    this.stats = { messagesSent: 0, messagesReceived: 0, commandsExecuted: 0, errors: 0 };
    this.loginMethod = null;
  }

  async initialize() {
    try {
      this.displayBanner();
      Logger.bot("جاري تشغيل Ghatwa Bot...");
      await FileManager.initializeDirectories();
      
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
      this.state = state;
      this.saveCreds = saveCreds;

      if (!this.state.creds.registered) {
        console.log(chalk.bold.yellow("\n--- نظام تسجيل الدخول ---"));
        console.log("1. QR Code");
        console.log("2. Pairing Code");
        const choice = await question(chalk.cyan("اختر طريقة تسجيل الدخول (1 أو 2): "));
        this.loginMethod = choice === "2" ? "pairing" : "qr";
      }

      await this.createSocket();
      this.setupEventHandlers();
      
      Logger.success("تم تهيئة البوت بنجاح");
      return this.socket;
    } catch (error) {
      Logger.error(`فشل التهيئة: ${error.message}`);
      this.stats.errors++;
      throw error;
    }
  }

  displayBanner() {
    console.clear();
    console.log(chalk.bold.cyan("╔══════════════════════════════════════════════════╗"));
    console.log(chalk.bold.cyan("║            GHATWA BOT MD - v" + APP_VERSION + "              ║"));
    console.log(chalk.bold.cyan("╠══════════════════════════════════════════════════╣"));
    console.log(chalk.bold.cyan("║      WhatsApp Multi-Device Bot by Ali           ║"));
    console.log(chalk.bold.cyan("╚══════════════════════════════════════════════════╝\n"));
  }

  async createSocket() {
    const { version } = await fetchLatestBaileysVersion();
    this.socket = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: this.loginMethod === "qr",
      auth: {
        creds: this.state.creds,
        keys: makeCacheableSignalKeyStore(this.state.keys, pino({ level: "silent" }))
      },
      browser: Browsers.macOS("Safari"),
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      getMessage: async () => ({ conversation: "رسالة غير متوفرة" })
    });

    if (this.loginMethod === "pairing" && !this.socket.authState.creds.registered) {
      const phoneNumber = await question(chalk.cyan("\nأدخل رقم الهاتف مع رمز الدولة (مثال: 212719558797): "));
      const code = await this.socket.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
      console.log(chalk.bold.green(`\nكود الاقتران الخاص بك هو: ${chalk.white.bgGreen.bold(code)}\n`));
    }
  }

  setupEventHandlers() {
    this.socket.ev.on("connection.update", this.handleConnectionUpdate.bind(this));
    this.socket.ev.on("creds.update", this.saveCreds);
    this.socket.ev.on("messages.upsert", this.handleIncomingMessages.bind(this));
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      this.isConnected = true;
      await this.onConnected();
    }
    if (connection === "close") {
      this.isConnected = false;
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        Logger.warning("إعادة الاتصال...");
        setTimeout(() => this.reconnect(), 5000);
      } else {
        Logger.error("تم تسجيل الخروج. يرجى حذف مجلد الجلسة وإعادة المحاولة.");
        process.exit(1);
      }
    }
  }

  async onConnected() {
    Logger.success("✅ تم الاتصال بـ WhatsApp بنجاح!");
    this.displayBotInfo();
    this.startBackgroundTasks();
    await this.notifyOwner();
    await this.loadPlugins();
  }

  displayBotInfo() {
    const user = this.socket.user;
    console.log(`
${chalk.bold.green("═══════ معلومات البوت ═══════")}
${chalk.cyan("👤 الاسم:")} ${user?.name || "غير معروف"}
${chalk.cyan("📞 الرقم:")} ${user?.id?.split(":")[0] || "غير معروف"}
${chalk.cyan("🚀 البادئة:")} ${config.prefix || "."}
${chalk.cyan("📅 التاريخ:")} ${TimeUtils.getCurrentDate()}
${chalk.cyan("⏰ الوقت:")} ${TimeUtils.getCurrentTime()}
${chalk.bold.green("══════════════════════════════")}
    `.trim());
  }

  startBackgroundTasks() {
    this.intervals.add(setInterval(async () => {
      if (this.socket?.user) {
        const uptime = TimeUtils.formatUptime(Date.now() - this.startTime);
        try { await this.socket.updateProfileStatus(`🚀 ${config.botName} Online | ⏱️ ${uptime}`); } catch (e) {}
      }
    }, 300000));
    this.intervals.add(setInterval(() => FileManager.cleanupTempFiles(), 3600000));
  }

  async notifyOwner() {
    if (!config.ownerNumber) return;
    const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;
    const uptime = TimeUtils.formatUptime(Date.now() - this.startTime);
    try {
      const msg = `تم تشغيل البوت بنجاح!\n⏰ وقت التشغيل: ${uptime}\n🚀 الإصدار: ${APP_VERSION}\n✅ البوت جاهز للاستخدام الآن!`;
      await this.socket.sendMessage(ownerJid, { text: this.formatter.success(msg) });
    } catch (e) {}
  }

  async loadPlugins() {
    try {
      const { default: initializePlugins } = await import("./main.js");
      this.pluginManager = await initializePlugins(this.socket);
      if (this.pluginManager) Logger.success(`تم تحميل ${this.pluginManager.getPluginCount()} إضافة`);
    } catch (e) {}
  }

  async reconnect() {
    try {
      if (this.socket) this.socket.end();
      await this.initialize();
    } catch (e) { this.stats.errors++; }
  }

  async handleIncomingMessages({ messages }) {
    this.stats.messagesReceived++;
    const msg = messages?.[0];
    if (!msg || !msg.message || msg.key.fromMe) return;
  }

  async shutdown() {
    for (const interval of this.intervals) clearInterval(interval);
    if (this.socket) await this.socket.end();
    process.exit(0);
  }
}

const bot = new WhatsAppBot();
bot.initialize().catch((err) => Logger.error("فشل تشغيل البوت", err));

process.on("SIGINT", () => bot.shutdown());
process.on("uncaughtException", (e) => Logger.error("خطأ غير معالج", e));
