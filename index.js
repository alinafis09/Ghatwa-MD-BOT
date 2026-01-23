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
import fs from "fs-extra";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";

/* ========= CONFIGURATION ========= */
import config from "./config.js";
import MessageFormatter from "./message-formatter.js"; // <-- إضافة مُنسق الرسائل

/* ========= CONSTANTS ========= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_PATH = "./Botsession";
const APP_VERSION = "2.0.0";

/* ========= UTILITY CLASSES ========= */

/**
 * نظام تسجيل محسن مع ألوان
 */
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
  
  static success(message, data = null) {
    this.log("success", message, data);
  }
  
  static info(message, data = null) {
    this.log("info", message, data);
  }
  
  static warning(message, data = null) {
    this.log("warn", message, data);
  }
  
  static error(message, data = null) {
    this.log("error", message, data);
  }
  
  static bot(message, data = null) {
    this.log("bot", message, data);
  }
  
  static debug(message, data = null) {
    if (process.env.DEBUG === "true") {
      this.log("debug", message, data);
    }
  }
}

/**
 * أدوات الوقت والتاريخ
 */
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
    return new Date().toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }
  
  static getCurrentTime() {
    return new Date().toLocaleTimeString("ar-SA", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

/**
 * مدير الجلسات والمجلدات
 */
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
      try {
        await fs.ensureDir(dir.path);
        Logger.info(`تم إنشاء المجلد: ${dir.name}`, dir.path);
      } catch (error) {
        Logger.warning(`فشل في إنشاء ${dir.name}: ${error.message}`);
      }
    }
  }
  
  static async cleanupTempFiles() {
    try {
      const files = await fs.readdir("./temp");
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join("./temp", file);
        const stats = await fs.stat(filePath);
        
        // حذف الملفات الأقدم من ساعة
        if (now - stats.mtimeMs > 3600000) {
          await fs.remove(filePath);
          Logger.debug(`تم حذف الملف المؤقت: ${file}`);
        }
      }
    } catch (error) {
      // تجاهل الأخطاء في التنظيف
    }
  }
}

/**
 * مدير الاتصال والإعدادات
 */
class ConnectionManager {
  constructor() {
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
  }
  
  async createSocket(state) {
    try {
      const { version } = await fetchLatestBaileysVersion();
      
      const socketConfig = {
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: config.showQR || false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        browser: Browsers.macOS("Safari"),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
        emitOwnEvents: true,
        defaultQueryTimeoutMs: 60000,
        getMessage: async (key) => {
          return {
            conversation: "رسالة غير متوفرة"
          };
        }
      };
      
      return makeWASocket(socketConfig);
    } catch (error) {
      Logger.error("فشل في إنشاء الاتصال", error.message);
      throw error;
    }
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
    this.connectionManager = new ConnectionManager();
    this.formatter = new MessageFormatter();
    this.pluginManager = null;
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      commandsExecuted: 0,
      errors: 0
    };
  }

  /**
   * تهيئة البوت
   */
  async initialize() {
    try {
      this.displayBanner();
      Logger.bot("جاري تشغيل Ghatwa Bot...");
      
      // إنشاء المجلدات الضرورية
      await FileManager.initializeDirectories();
      
      // تحميل حالة المصادقة
      await this.loadAuthState();
      
      // إنشاء اتصال السوكيت
      await this.createSocket();
      
      // إعداد معالج الأحداث
      this.setupEventHandlers();
      
      Logger.success("تم تهيئة البوت بنجاح");
      return this.socket;
    } catch (error) {
      Logger.error(`فشل التهيئة: ${error.message}`);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * عرض بانر البوت
   */
  displayBanner() {
    console.clear();
    console.log(chalk.bold.cyan("╔══════════════════════════════════════════════════╗"));
    console.log(chalk.bold.cyan("║            GHATWA BOT MD - v" + APP_VERSION + "              ║"));
    console.log(chalk.bold.cyan("╠══════════════════════════════════════════════════╣"));
    console.log(chalk.bold.cyan("║      WhatsApp Multi-Device Bot by Ali           ║"));
    console.log(chalk.bold.cyan("╚══════════════════════════════════════════════════╝\n"));
  }

  /**
   * تحميل حالة المصادقة
   */
  async loadAuthState() {
    try {
      const authState = await useMultiFileAuthState(SESSION_PATH);
      this.state = authState.state;
      this.saveCreds = authState.saveCreds;
      
      if (this.state.creds.registered) {
        Logger.success("تم تحميل الجلسة السابقة");
      } else {
        Logger.info("جلسة جديدة، يلزم تسجيل الدخول");
      }
    } catch (error) {
      Logger.error(`فشل تحميل حالة المصادقة: ${error.message}`);
      throw error;
    }
  }

  /**
   * إنشاء اتصال السوكيت
   */
  async createSocket() {
    this.socket = await this.connectionManager.createSocket(this.state);
    Logger.success("تم إنشاء الاتصال");
  }

  /**
   * إعداد معالج الأحداث
   */
  setupEventHandlers() {
    // أحداث الاتصال
    this.socket.ev.on("connection.update", this.handleConnectionUpdate.bind(this));
    this.socket.ev.on("creds.update", this.saveCreds);
    
    // أحداث الرسائل
    this.socket.ev.on("messages.upsert", this.handleIncomingMessages.bind(this));
    
    // أحداث الحالة
    this.socket.ev.on("presence.update", this.handlePresenceUpdate.bind(this));
    
    // أحداث المجموعات
    this.socket.ev.on("groups.update", this.handleGroupsUpdate.bind(this));
    
    Logger.info("تم إعداد معالج الأحداث");
  }

  /**
   * معالجة تحديثات الاتصال
   */
  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;
    
    // عرض كود QR إذا كان مطلوب
    if (qr && config.showQR !== false) {
      console.log("\n" + chalk.yellow("📱 يرجى مسح كود QR للتسجيل:"));
      qrcode.generate(qr, { small: true });
    }
    
    // حالة الاتصال المفتوح
    if (connection === "open") {
      this.isConnected = true;
      await this.onConnected();
    }
    
    // حالة الاتصال المغلق
    if (connection === "close") {
      this.isConnected = false;
      await this.onDisconnected(lastDisconnect);
    }
    
    // تحديث حالة الاتصال
    if (connection === "connecting") {
      Logger.info("جاري الاتصال بـ WhatsApp...");
    }
  }

  /**
   * عند الاتصال بنجاح
   */
  async onConnected() {
    this.connectionAttempts = 0;
    Logger.success("✅ تم الاتصال بـ WhatsApp بنجاح!");
    
    // عرض معلومات البوت
    this.displayBotInfo();
    
    // بدء المهام الخلفية
    this.startBackgroundTasks();
    
    // إرسال إشعار للمالك
    await this.notifyOwner();
    
    // تحميل الإضافات
    await this.loadPlugins();
    
    // تسجيل حالة التشغيل
    await this.logStartup();
  }

  /**
   * عرض معلومات البوت
   */
  displayBotInfo() {
    const user = this.socket.user;
    const botInfo = `
${chalk.bold.green("═══════ معلومات البوت ═══════")}
${chalk.cyan("👤 الاسم:")} ${user?.name || "غير معروف"}
${chalk.cyan("📞 الرقم:")} ${user?.id?.split(":")[0]?.replace("+", "") || "غير معروف"}
${chalk.cyan("🆔 المعرف:")} ${user?.id?.substring(0, 20) || "غير معروف"}
${chalk.cyan("🚀 البادئة:")} ${config.prefix || "."}
${chalk.cyan("📅 التاريخ:")} ${TimeUtils.getCurrentDate()}
${chalk.cyan("⏰ الوقت:")} ${TimeUtils.getCurrentTime()}
${chalk.bold.green("══════════════════════════════")}
    `.trim();
    
    console.log(botInfo);
  }

  /**
   * بدء المهام الخلفية
   */
  startBackgroundTasks() {
    // تحديث وقت التشغيل في الحالة
    const uptimeInterval = setInterval(async () => {
      if (this.socket?.user) {
        const uptime = TimeUtils.formatUptime(Date.now() - this.startTime);
        try {
          await this.socket.updateProfileStatus(
            this.formatter.formatStatus(uptime)
          );
        } catch (error) {
          // تجاهل الأخطاء
        }
      }
    }, 300000); // كل 5 دقائق
    
    this.intervals.add(uptimeInterval);
    
    // فحص الاتصال التلقائي
    const connectionCheck = setInterval(() => {
      if (!this.isConnected) {
        Logger.warning("فقدان الاتصال، جاري إعادة المحاولة...");
        this.reconnect();
      }
    }, 15000);
    
    this.intervals.add(connectionCheck);
    
    // تنظيف الملفات المؤقتة
    const cleanupInterval = setInterval(async () => {
      await FileManager.cleanupTempFiles();
    }, 3600000); // كل ساعة
    
    this.intervals.add(cleanupInterval);
    
    // تحديث الإحصائيات
    const statsInterval = setInterval(() => {
      this.displayStats();
    }, 1800000); // كل 30 دقيقة
    
    this.intervals.add(statsInterval);
    
    Logger.info("تم بدء المهام الخلفية");
  }

  /**
   * إشعار المالك
   */
  async notifyOwner() {
    if (!config.ownerNumber) {
      Logger.warning("لم يتم تعيين رقم المالك في الإعدادات");
      return;
    }
    
    const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;
    const uptime = TimeUtils.formatUptime(Date.now() - this.startTime);
    
    try {
      const welcomeMessage = this.formatter.success(
        `تم تشغيل البوت بنجاح!\n\n` +
        `⏰ وقت التشغيل: ${uptime}\n` +
        `👤 اسم البوت: ${this.socket.user?.name || "غير معروف"}\n` +
        `🚀 الإصدار: ${APP_VERSION}\n` +
        `📅 التاريخ: ${TimeUtils.getCurrentDate()}\n\n` +
        `✅ البوت جاهز للاستخدام الآن!`
      );
      
      await this.socket.sendMessage(ownerJid, { text: welcomeMessage });
      Logger.success("تم إرسال إشعار للمالك");
    } catch (error) {
      Logger.warning(`فشل إرسال إشعار للمالك: ${error.message}`);
    }
  }

  /**
   * تحميل الإضافات
   */
  async loadPlugins() {
    try {
      const { default: initializePlugins } = await import("./main.js");
      this.pluginManager = await initializePlugins(this.socket);
      
      if (this.pluginManager) {
        Logger.success(`تم تحميل ${this.pluginManager.getPluginCount()} إضافة`);
      }
    } catch (error) {
      Logger.error(`فشل تحميل الإضافات: ${error.message}`);
    }
  }

  /**
   * تسجيل بدء التشغيل
   */
  async logStartup() {
    const startupLog = {
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      user: this.socket.user,
      config: {
        prefix: config.prefix,
        botName: config.botName,
        owner: config.ownerNumber
      },
      uptime: Date.now() - this.startTime
    };
    
    try {
      await fs.writeJson(
        "./logs/startup.json",
        startupLog,
        { spaces: 2 }
      );
      Logger.debug("تم حفظ سجل بدء التشغيل");
    } catch (error) {
      // تجاهل الأخطاء في التسجيل
    }
  }

  /**
   * عند فقدان الاتصال
   */
  async onDisconnected(lastDisconnect) {
    Logger.warning("❌ فقدان الاتصال بـ WhatsApp");
    
    // تنظيف الفواصل الزمنية
    this.cleanupIntervals();
    
    const shouldReconnect = 
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    
    if (shouldReconnect && this.connectionAttempts < this.connectionManager.maxRetries) {
      this.connectionAttempts++;
      const delayTime = Math.min(5000 * this.connectionAttempts, 30000);
      
      Logger.info(`إعادة الاتصال في ${delayTime / 1000} ثانية (المحاولة ${this.connectionAttempts}/${this.connectionManager.maxRetries})`);
      
      await delay(delayTime);
      await this.reconnect();
    } else {
      Logger.error("تم تسجيل الخروج. يلزم إعادة تسجيل الدخول.");
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * إعادة الاتصال
   */
  async reconnect() {
    try {
      Logger.info("🔄 جاري إعادة الاتصال...");
      
      // تنظيف الاتصال السابق
      if (this.socket) {
        try {
          await this.socket.end();
        } catch (error) {
          // تجاهل الأخطاء
        }
      }
      
      // إعادة التهيئة
      await this.initialize();
      
    } catch (error) {
      Logger.error(`فشل إعادة الاتصال: ${error.message}`);
      this.stats.errors++;
    }
  }

  /**
   * معالجة الرسائل الواردة
   */
  async handleIncomingMessages({ messages }) {
    this.stats.messagesReceived++;
    
    const msg = messages?.[0];
    if (!msg || !msg.message || msg.key.fromMe) return;
    
    // تسجيل الرسالة الواردة
    this.logIncomingMessage(msg);
    
    // معالجة رسائل القنوات
    if (msg.key.remoteJid?.endsWith("@newsletter")) {
      await this.handleChannelMessage(msg);
      return;
    }
  }

  /**
   * تسجيل الرسائل الواردة
   */
  logIncomingMessage(msg) {
    if (process.env.LOG_MESSAGES === "true") {
      const sender = msg.key.remoteJid?.split("@")[0] || "unknown";
      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text?.substring(0, 50) || 
                   "[وسائط]";
      
      Logger.debug(`رسالة واردة من ${sender}: ${text}`);
    }
  }

  /**
   * معالجة رسائل القنوات
   */
  async handleChannelMessage(msg) {
    const channelId = msg.key.remoteJid.split("@")[0];
    const text = this.extractMessageText(msg);
    
    Logger.info(`رسالة من القناة ${channelId}`, text.substring(0, 100));
    
    // يمكن إضافة معالجة إضافية هنا
  }

  /**
   * استخراج نص الرسالة
   */
  extractMessageText(msg) {
    return (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      msg.message.documentMessage?.caption ||
      ""
    );
  }

  /**
   * معالجة تحديثات الحالة
   */
  async handlePresenceUpdate(update) {
    // يمكن إضافة معالجة لتحديثات الحالة
    Logger.debug("تحديث حالة", update.id);
  }

  /**
   * معالجة تحديثات المجموعات
   */
  async handleGroupsUpdate(updates) {
    for (const update of updates) {
      Logger.info(`تحديث مجموعة: ${update.id?.substring(0, 10)}...`);
    }
  }

  /**
   * عرض الإحصائيات
   */
  displayStats() {
    const statsMessage = `
${chalk.bold.yellow("═══════ إحصائيات البوت ═══════")}
${chalk.cyan("📨 الرسائل المرسلة:")} ${this.stats.messagesSent}
${chalk.cyan("📩 الرسائل الواردة:")} ${this.stats.messagesReceived}
${chalk.cyan("⚡ الأوامر المنفذة:")} ${this.stats.commandsExecuted}
${chalk.cyan("❌ الأخطاء:")} ${this.stats.errors}
${chalk.cyan("⏰ وقت التشغيل:")} ${TimeUtils.formatUptime(Date.now() - this.startTime)}
${chalk.bold.yellow("══════════════════════════════")}
    `.trim();
    
    console.log(statsMessage);
  }

  /**
   * تنظيف الفواصل الزمنية
   */
  cleanupIntervals() {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    Logger.info("تم تنظيف الفواصل الزمنية");
  }

  /**
   * إيقاف البوت
   */
  async shutdown() {
    Logger.info("جاري إيقاف البوت...");
    
    // تنظيف الموارد
    this.cleanupIntervals();
    
    // إغلاق الاتصال
    if (this.socket) {
      try {
        await this.socket.end();
        Logger.success("تم إغلاق الاتصال");
      } catch (error) {
        Logger.warning("فشل إغلاق الاتصال", error.message);
      }
    }
    
    // تسجيل إيقاف التشغيل
    await this.logShutdown();
    
    Logger.success("تم إيقاف البوت بنجاح");
  }

  /**
   * تسجيل إيقاف التشغيل
   */
  async logShutdown() {
    const shutdownLog = {
      timestamp: new Date().toISOString(),
      totalUptime: Date.now() - this.startTime,
      stats: this.stats
    };
    
    try {
      await fs.writeJson(
        "./logs/shutdown.json",
        shutdownLog,
        { spaces: 2 }
      );
    } catch (error) {
      // تجاهل الأخطاء
    }
  }
}

/* ========= APPLICATION ENTRY POINT ========= */
async function startApplication() {
  // معالجة إشارات النظام
  process.on("SIGINT", async () => {
    Logger.warning("\n📴 تم استقبال أمر الإيقاف (SIGINT)...");
    await bot?.shutdown();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    Logger.warning("\n📴 تم استقبال أمر الإنهاء (SIGTERM)...");
    await bot?.shutdown();
    process.exit(0);
  });
  
  process.on("uncaughtException", (error) => {
    Logger.error(`❌ خطأ غير معالج: ${error.message}`, error.stack);
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    Logger.error(`❌ رفض غير معالج في: ${promise}`, reason);
  });
  
  // بدء البوت
  let bot;
  try {
    bot = new WhatsAppBot();
    await bot.initialize();
    
    Logger.bot("Ghatwa Bot جاهز للعمل! 🚀");
    
    // إظهار معلومات المساعدة
    console.log(chalk.gray("\n📚 أوامر التحكم:"));
    console.log(chalk.gray("  Ctrl+C - إيقاف البوت"));
    console.log(chalk.gray("  .menu - عرض قائمة الأوامر\n"));
    
  } catch (error) {
    Logger.error(`فشل تشغيل البوت: ${error.message}`);
    process.exit(1);
  }
}

/* ========= START THE APPLICATION ========= */
startApplication();
