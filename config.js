/* ============================================
   CONFIGURATION FILE - GHATWA BOT MD
   إعدادات بوت WhatsApp متعدد الأجهزة
   ============================================ */

export default {
  /* ========= BASIC CONFIGURATION ========= */
  prefix: ".",
  botName: "Ghatwa Bot",
  botEmoji: "🤖",
  version: "2.0.0",
  
  /* ========= OWNER INFORMATION ========= */
  ownerNumber: "212719558797",  // رقم المالك بدون +
  ownerName: "Ali",
  
  /* ========= MESSAGE SETTINGS ========= */
  messageSettings: {
    showNameInMessages: true,
    showFooter: true,
    footerText: "🤖 Ghatwa Bot MD v2.0",
    showTimestamp: true,
    replyToMessages: true,
    
    // إعدادات التنسيق
    textFormat: {
      bold: true,
      italic: false,
      monospace: false
    },
    
    // إعدادات الرد التلقائي
    autoReply: {
      enabled: true,
      greetingMessage: "مرحباً! 👋\nكيف يمكنني مساعدتك؟",
      offlineMessage: "البوت غير متصل حالياً ⚠️"
    }
  },
  
  /* ========= MENU IMAGES CONFIGURATION ========= */
  menuImages: {
    // إعدادات صور القوائم
    enabled: true,
    
    // 5 أماكن مخصصة لصور القوائم
    mainMenu: {
      url: "https://example.com/images/menu/main.jpg",  // رابط الصورة الرئيسية
      localPath: "./media/menu/main.jpg",               // المسار المحلي للصورة
      caption: "📱 *القائمة الرئيسية*\nاختر من الأوامر أدناه 👇",
      useLocal: true  // استخدام الصورة المحلية إذا كانت موجودة
    },
    
    toolsMenu: {
      url: "https://example.com/images/menu/tools.jpg",
      localPath: "./media/menu/tools.jpg",
      caption: "🛠️ *قائمة الأدوات*\nأدوات مفيدة للاستخدام اليومي",
      useLocal: true
    },
    
    mediaMenu: {
      url: "https://example.com/images/menu/media.jpg",
      localPath: "./media/menu/media.jpg",
      caption: "🎵 *قائمة الوسائط*\nتحميل وتنزيل الوسائط",
      useLocal: true
    },
    
    gamesMenu: {
      url: "https://example.com/images/menu/games.jpg",
      localPath: "./media/menu/games.jpg",
      caption: "🎮 *قائمة الألعاب*\ألعاب مسلية وتفاعلية",
      useLocal: true
    },
    
    ownerMenu: {
      url: "https://example.com/images/menu/owner.jpg",
      localPath: "./media/menu/owner.jpg",
      caption: "👑 *قائمة المالك*\nأوامر خاصة بمالك البوت",
      useLocal: true
    },
    
    // إعدادات إضافية للصور
    defaultImage: "https://example.com/images/menu/default.jpg",
    fallbackToText: true,  // الرجوع للنص إذا فشل تحميل الصورة
    imageSize: "large",    // small, medium, large
    cacheImages: true,     // تخزين الصور مؤقتاً
    cacheDuration: 86400000 // مدة التخزين بالميلي ثانية (24 ساعة)
  },
  
  /* ========= CONNECTION SETTINGS ========= */
  connection: {
    showQR: true,
    autoReconnect: true,
    maxRetries: 5,
    reconnectDelay: 5000,
    browser: "Safari",
    markOnline: true
  },
  
  /* ========= PLUGIN SETTINGS ========= */
  plugins: {
    autoLoad: true,
    reloadOnChange: true,
    pluginsDirectory: "./plugins",
    whitelist: [],  // قائمة بالإضافات المسموح بها
    blacklist: []   // قائمة بالإضافات الممنوعة
  },
  
  /* ========= MEDIA SETTINGS ========= */
  media: {
    maxFileSize: 100,  // الحد الأقصى لحجم الملف بالـ MB
    allowedFormats: ["jpg", "jpeg", "png", "gif", "mp4", "mp3", "pdf"],
    tempDir: "./temp",
    downloadDir: "./downloads",
    
    // إعدادات معالجة الصور
    imageProcessing: {
      enabled: true,
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 85
    }
  },
  
  /* ========= SECURITY SETTINGS ========= */
  security: {
    antiSpam: true,
    maxCommandsPerMinute: 10,
    blacklistNumbers: [],
    whitelistNumbers: [],  // إذا كان فارغاً يسمح للجميع
    requirePrefix: true,
    
    // حماية المجموعات
    groupProtection: {
      enabled: true,
      antiLink: false,
      antiBadWords: false,
      welcomeMessage: true
    }
  },
  
  /* ========= DATABASE SETTINGS ========= */
  database: {
    enabled: false,
    type: "json",  // json, sqlite, mongodb
    path: "./database",
    
    // إعدادات SQLite
    sqlite: {
      filename: "bot.db"
    },
    
    // إعدادات MongoDB
    mongodb: {
      url: "mongodb://localhost:27017",
      dbName: "ghatwabot"
    }
  },
  
  /* ========= LOGGING SETTINGS ========= */
  logging: {
    enabled: true,
    level: "info",  // error, warn, info, debug
    logToFile: true,
    logDir: "./logs",
    maxLogSize: 10485760,  // 10MB
    maxLogFiles: 10
  },
  
  /* ========= API KEYS (Optional) ========= */
  apiKeys: {
    openai: "",
    google: "",
    weather: "",
    youtube: ""
  },
  
  /* ========= FEATURE TOGGLES ========= */
  features: {
    // الميزات الأساسية
    commands: true,
    mediaDownload: true,
    stickers: true,
    quotes: true,
    
    // الميزات المتقدمة
    aiChat: false,
    autoReply: true,
    scheduler: false,
    reminders: false,
    
    // ميزات المجموعات
    groupCommands: true,
    welcomeMessage: true,
    goodbyeMessage: false,
    autoPromote: false
  },
  
  /* ========= PERFORMANCE SETTINGS ========= */
  performance: {
    maxConcurrentDownloads: 3,
    cleanupInterval: 3600000,  // تنظيف الملفات كل ساعة
    cacheEnabled: true,
    cacheTTL: 300000  // 5 دقائق
  },
  
  /* ========= CUSTOMIZATION ========= */
  customization: {
    // الألوان
    colors: {
      primary: "#5865F2",
      success: "#57F287",
      warning: "#FEE75C",
      error: "#ED4245",
      info: "#3498DB"
    },
    
    // الإيموجيات
    emojis: {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
      loading: "⏳",
      done: "✨"
    },
    
    // الرسائل المخصصة
    messages: {
      welcome: "🎉 مرحباً بك في {botName}!",
      help: "اكتب `.menu` لعرض الأوامر المتاحة",
      error: "⚠️ حدث خطأ، يرجى المحاولة مرة أخرى",
      noPermission: "⛔ ليس لديك صلاحية لاستخدام هذا الأمر"
    }
  },
  
  /* ========= UPDATE SETTINGS ========= */
  updates: {
    checkForUpdates: true,
    autoUpdate: false,
    updateChannel: "120363403118420523@newsletter",  // قناة التحديثات
    notifyOnUpdate: true
  }
};
