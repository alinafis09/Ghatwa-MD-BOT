import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import config from "./config.js";

/* ========= FIX __dirname ========= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ========= CONSTANTS ========= */
const PLUGINS_DIR = path.join(__dirname, "plugins");
const PREFIX = config.prefix || ".";

/* ========= HELPER FUNCTIONS ========= */
function ensurePluginsDirectory() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  }
}

function getMessageText(msg) {
  return (
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    ""
  );
}

function parseCommand(text) {
  if (!text.startsWith(PREFIX)) return null;
  
  const args = text.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  const query = args.join(" ");
  
  return { command, query, args };
}

async function loadPlugin(file) {
  try {
    const filePath = path.join(PLUGINS_DIR, file);
    const fileUrl = pathToFileURL(filePath).href + `?v=${Date.now()}`;
    const module = await import(fileUrl);
    const plugin = module.default || module;
    
    if (plugin.command && typeof plugin.handler === "function") {
      return {
        name: plugin.command.toLowerCase(),
        handler: plugin.handler,
        plugin
      };
    }
    return null;
  } catch (error) {
    console.error(`❌ Plugin error (${file})`, error.message);
    return null;
  }
}

/* ========= PLUGIN MANAGER ========= */
class PluginManager {
  constructor() {
    this.plugins = new Map();
  }

  async loadPlugins() {
    ensurePluginsDirectory();
    this.plugins.clear();
    
    const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith(".js"));
    
    for (const file of files) {
      const plugin = await loadPlugin(file);
      if (plugin) {
        this.plugins.set(plugin.name, plugin);
        console.log(`✅ Loaded plugin: ${plugin.name}`);
      }
    }
    
    console.log(`📦 Total plugins loaded: ${this.plugins.size}`);
  }

  getPlugin(command) {
    return this.plugins.get(command.toLowerCase());
  }

  hasPlugin(command) {
    return this.plugins.has(command.toLowerCase());
  }
}

/* ========= MESSAGE HANDLER ========= */
async function handleMessage(sock, msg, pluginManager) {
  const text = getMessageText(msg);
  const parsed = parseCommand(text);
  
  if (!parsed) return;
  
  const { command, query, args } = parsed;
  const jid = msg.key.remoteJid;
  const plugin = pluginManager.getPlugin(command);
  
  if (!plugin) return;
  
  try {
    await plugin.handler(sock, msg, query, args, jid);
  } catch (error) {
    console.error(`❌ Command error (${command})`, error);
    
    await sock.sendMessage(
      jid,
      { text: "❌ وقع خطأ فالأمر، عاود جرب" },
      { quoted: msg }
    );
  }
}

/* ========= MAIN FUNCTION ========= */
export default async function main(sock) {
  const pluginManager = new PluginManager();
  
  // Load plugins initially
  await pluginManager.loadPlugins();
  
  // Set up message listener
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages?.[0];
    
    if (!msg || !msg.message || msg.key.fromMe) return;
    
    await handleMessage(sock, msg, pluginManager);
  });
  
  console.log("🚀 Main system ready");
  
  // Return plugin manager for potential external access
  return pluginManager;
}
