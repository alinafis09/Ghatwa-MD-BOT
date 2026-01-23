import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import config from "./config.js";
import messageFormatter from "./message-formatter.js"; // <-- إضافة هذا

/* ========= FIX __dirname ========= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function main(sock) {
  const plugins = new Map();
  const pluginsDir = path.join(__dirname, "plugins");

  /* ========= LOAD PLUGINS ========= */
  async function loadPlugins() {
    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
    }
    
    plugins.clear();
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));
    
    for (const file of files) {
      try {
        const filePath = path.join(pluginsDir, file);
        const fileUrl = pathToFileURL(filePath).href + `?v=${Date.now()}`;
        const module = await import(fileUrl);
        const plugin = module.default || module;
        
        if (plugin.command && typeof plugin.handler === "function") {
          plugins.set(plugin.command.toLowerCase(), plugin);
          console.log(`✅ Loaded plugin: ${plugin.command}`);
        }
      } catch (e) {
        console.error(`❌ Plugin error (${file})`, e.message);
      }
    }
  }

  await loadPlugins();

  /* ========= ENHANCED SEND MESSAGE FUNCTION ========= */
  async function sendFormattedMessage(jid, content, options = {}) {
    try {
      const {
        type = "normal",
        title = null,
        quoted = null,
        footer = true,
        showName = true
      } = options;

      // تنسيق الرسالة
      const formattedContent = messageFormatter.formatMessage(content, {
        type,
        title,
        footer,
        showName
      });

      // إرسال الرسالة
      const messageOptions = {
        quoted: quoted
      };

      const result = await sock.sendMessage(jid, {
        text: formattedContent
      }, messageOptions);

      // تسجيل في الكونسول
      messageFormatter.logSentMessage(
        "text",
        jid,
        content.substring(0, 100)
      );

      return result;
    } catch (error) {
      console.error("❌ Error sending message:", error.message);
      throw error;
    }
  }

  /* ========= ENHANCED MESSAGE HANDLER ========= */
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages?.[0];
    if (!msg || !msg.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      "";

    const prefix = config.prefix || ".";
    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();
    const query = args.join(" ");
    const jid = msg.key.remoteJid;
    const plugin = plugins.get(command);

    if (!plugin) {
      // رد تلقائي إذا الأمر غير موجود
      await sendFormattedMessage(
        jid,
        `الأمر \`${command}\` غير موجود.\n\n` +
        `استخدم \`${prefix}menu\` لرؤية جميع الأوامر المتاحة.`,
        {
          type: "error",
          title: "أمر غير معروف",
          quoted: msg
        }
      );
      return;
    }

    try {
      // تمرير دالة sendFormattedMessage للإضافة
      await plugin.handler({
        sock,
        msg,
        query,
        args,
        jid,
        send: sendFormattedMessage, // <-- تمرير الدالة المحسنة
        config,
        formatter: messageFormatter
      });
    } catch (e) {
      console.error(`❌ Command error (${command})`, e);
      
      await sendFormattedMessage(
        jid,
        "حدث خطأ أثناء تنفيذ الأمر. يرجى المحاولة مرة أخرى.\n\n" +
        "إذا استمر الخطأ، تواصل مع المطور.",
        {
          type: "error",
          title: "خطأ في التنفيذ",
          quoted: msg
        }
      );
    }
  });

  console.log("🚀 Main system ready with enhanced messaging");
  
  // إرجاع الدالة المحسنة للإرسال
  return { sendFormattedMessage };
  }
