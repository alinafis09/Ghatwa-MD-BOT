import config from "./config.js";
import chalk from "chalk";

export class MessageFormatter {
  constructor() {
    this.botName = config.botName || "Ghatwa Bot";
    this.botEmoji = config.botEmoji || "🤖";
    this.settings = config.messageSettings || {};
  }

  /**
   * تنسيق الرسائل مع اسم البوت
   */
  formatMessage(content, options = {}) {
    const {
      type = "normal",
      title = null,
      footer = this.settings.showFooter,
      timestamp = this.settings.showTimestamp,
      showName = this.settings.showNameInMessages
    } = options;

    let formattedMessage = "";

    // إضافة العنوان إذا موجود
    if (title) {
      formattedMessage += `✨ *${title}*\n\n`;
    }

    // إضافة اسم البوت في البداية
    if (showName && type !== "simple") {
      formattedMessage += `${this.botEmoji} *${this.botName}*\n`;
      formattedMessage += "═".repeat(30) + "\n\n";
    }

    // إضافة المحتوى
    formattedMessage += content;

    // إضافة التذييل
    if (footer && type !== "simple") {
      formattedMessage += `\n\n${"─".repeat(25)}\n`;
      formattedMessage += `_${this.settings.footerText || this.botName}_`;
      
      // إضافة الوقت إذا مطلوب
      if (timestamp) {
        const time = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
        formattedMessage += ` • ${time}`;
      }
    }

    return formattedMessage;
  }

  /**
   * ⚡ تنسيق خاص لرسائل البينغ (الجديد)
   */
  formatPingMessage(content, pingTime, options = {}) {
    const {
      type = "ping",
      title = "⚡ فحص السرعة",
      footer = this.settings.showFooter,
      timestamp = this.settings.showTimestamp,
      showName = this.settings.showNameInMessages,
      showStatus = true
    } = options;

    let formattedMessage = "";

    // إضافة العنوان
    if (title) {
      formattedMessage += `✨ *${title}*\n\n`;
    }

    // إضافة اسم البوت في البداية
    if (showName && type !== "simple") {
      formattedMessage += `${this.botEmoji} *${this.botName}*\n`;
      formattedMessage += "═".repeat(30) + "\n\n";
    }

    // إضافة حالة البينغ إذا مطلوب
    if (showStatus && pingTime !== undefined) {
      let statusEmoji = "🟢";
      let statusText = "ممتاز";
      
      if (pingTime >= 100 && pingTime < 300) {
        statusEmoji = "🟡";
        statusText = "جيد";
      } else if (pingTime >= 300 && pingTime < 500) {
        statusEmoji = "🟠";
        statusText = "مقبول";
      } else if (pingTime >= 500) {
        statusEmoji = "🔴";
        statusText = "بطيء";
      }
      
      formattedMessage += `${statusEmoji} *سرعة الاستجابة:* ${pingTime}ms (${statusText})\n`;
      formattedMessage += "─".repeat(30) + "\n\n";
    }

    // إضافة المحتوى
    formattedMessage += content;

    // إضافة التذييل
    if (footer && type !== "simple") {
      formattedMessage += `\n\n${"─".repeat(25)}\n`;
      formattedMessage += `_${this.settings.footerText || "🤖 نظام فحص السرعة"}_`;
      
      // إضافة الوقت إذا مطلوب
      if (timestamp) {
        const time = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
        formattedMessage += ` • ${time}`;
      }
    }

    return formattedMessage;
  }

  /**
   * 📊 تحليل البينغ وإرجاع معلومات (الجديد)
   */
  analyzePing(pingTime) {
    const analysis = {
      emoji: "🟢",
      status: "ممتاز",
      description: "الأداء في أفضل حالاته",
      recommendation: "لا حاجة لأي إجراء"
    };
    
    if (pingTime >= 100 && pingTime < 300) {
      analysis.emoji = "🟡";
      analysis.status = "جيد";
      analysis.description = "الأداء مقبول ولا مشاكل كبيرة";
      analysis.recommendation = "يمكنك المتابعة بشكل طبيعي";
    } else if (pingTime >= 300 && pingTime < 500) {
      analysis.emoji = "🟠";
      analysis.status = "مقبول";
      analysis.description = "هناك بعض التأخير ولكن يمكن التحمل";
      analysis.recommendation = "فحص اتصال الإنترنت";
    } else if (pingTime >= 500) {
      analysis.emoji = "🔴";
      analysis.status = "بطيء";
      analysis.description = "أداء غير مقبول، هناك مشكلة";
      analysis.recommendation = "تحقق من الخادم والاتصال";
    }
    
    return analysis;
  }

  /**
   * 📈 شريط التقدم للبينغ (الجديد)
   */
  pingProgressBar(pingTime, maxPing = 1000) {
    const percentage = Math.min((pingTime / maxPing) * 100, 100);
    const barLength = 20;
    const filled = Math.round((percentage / 100) * barLength);
    
    let bar = "";
    for (let i = 0; i < barLength; i++) {
      if (i < filled) {
        if (pingTime < 100) bar += "🟩";
        else if (pingTime < 300) bar += "🟨";
        else if (pingTime < 500) bar += "🟧";
        else bar += "🟥";
      } else {
        bar += "⬜";
      }
    }
    
    return `${bar} ${Math.round(percentage)}%`;
  }

  /**
   * ⚡ تلوين البينغ حسب القيمة (الجديد)
   */
  colorCodePing(pingTime) {
    if (pingTime < 100) return `🟢 ${pingTime}ms`;
    if (pingTime < 300) return `🟡 ${pingTime}ms`;
    if (pingTime < 500) return `🟠 ${pingTime}ms`;
    return `🔴 ${pingTime}ms`;
  }

  /**
   * 🎯 تنسيق وقت البينغ (الجديد)
   */
  formatPingTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds} ثانية`;
  }

  /**
   * رسالة نجاح
   */
  success(message, title = "✅ تم بنجاح") {
    return this.formatMessage(message, {
      title: title,
      type: "success"
    });
  }

  /**
   * رسالة خطأ
   */
  error(message, title = "❌ خطأ") {
    return this.formatMessage(message, {
      title: title,
      type: "error"
    });
  }

  /**
   * رسالة معلومات
   */
  info(message, title = "ℹ️ معلومة") {
    return this.formatMessage(message, {
      title: title,
      type: "info"
    });
  }

  /**
   * رسالة تحذير
   */
  warning(message, title = "⚠️ تحذير") {
    return this.formatMessage(message, {
      title: title,
      type: "warning"
    });
  }

  /**
   * قائمة منسقة
   */
  list(items, title = "📋 القائمة") {
    const listContent = items.map((item, index) => 
      `▫️ ${index + 1}. ${item}`
    ).join("\n");
    
    return this.formatMessage(listContent, {
      title: title,
      type: "list"
    });
  }

  /**
   * رسالة بسيطة بدون تنسيق
   */
  simple(message) {
    return this.formatMessage(message, {
      type: "simple",
      showName: false,
      footer: false,
      timestamp: false
    });
  }

  /**
   * رسالة مع إيموجي مخصص
   */
  withEmoji(message, emoji, title = null) {
    const actualTitle = title ? `${emoji} ${title}` : null;
    return this.formatMessage(message, {
      title: actualTitle,
      type: "emoji"
    });
  }

  /**
   * رسالة للأوامر
   */
  commandHelp(command, description, usage, examples = []) {
    let content = `*📝 الوصف:* ${description}\n\n`;
    content += `*⚙️ الاستخدام:* \`${config.prefix}${command} ${usage}\`\n\n`;
    
    if (examples.length > 0) {
      content += `*💡 أمثلة:*\n`;
      examples.forEach((example, index) => {
        content += `  ${index + 1}. \`${config.prefix}${example}\`\n`;
      });
    }
    
    return this.formatMessage(content, {
      title: `🎮 أمر: ${command}`,
      type: "help"
    });
  }

  /**
   * تنسيق لرسائل الوسائط (الصور/الفيديوهات)
   */
  mediaCaption(text, mediaType = "صورة") {
    return this.formatMessage(text, {
      title: `${this.botEmoji} ${mediaType} من ${this.botName}`,
      type: "media",
      showName: false
    });
  }

  /**
   * تسجيل الرسائل في الكونسول
   */
  logSentMessage(type, to, contentPreview) {
    const time = new Date().toLocaleTimeString();
    const preview = contentPreview.length > 50 
      ? contentPreview.substring(0, 50) + "..." 
      : contentPreview;
    
    console.log(
      chalk.cyan(`[${time}]`),
      chalk.green(`📤 ${type.toUpperCase()} →`),
      chalk.yellow(to.substring(0, 15) + "..."),
      chalk.gray(`"${preview}"`)
    );
  }

  /**
   * 📥 تسجيل الرسائل الواردة (الجديد)
   */
  logReceivedMessage(from, contentPreview) {
    const time = new Date().toLocaleTimeString();
    const preview = contentPreview.length > 50 
      ? contentPreview.substring(0, 50) + "..." 
      : contentPreview;
    
    console.log(
      chalk.cyan(`[${time}]`),
      chalk.blue(`📥 ←`),
      chalk.magenta(from.substring(0, 15) + "..."),
      chalk.gray(`"${preview}"`)
    );
  }
}

export default new MessageFormatter();
