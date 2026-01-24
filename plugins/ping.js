import os from 'os';
import process from 'process';
import { performance } from 'perf_hooks';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import config from '../config.js';

const execAsync = promisify(exec);

/**
 * 🚀 Ping Command Plugin
 * Professional Ping System with Detailed Statistics
 */

export default {
    command: "ping",
    aliases: ["speed", "test", "p", "فحص"],
    category: ["main"],
    description: "فحص سرعة البوت والأداء",
    usage: ".ping [detailed/server/memory]",
    example: ".ping detailed\n.ping server\n.ping memory",
    
    settings: {
        owner: false,
        group: false,
        private: true,
        admin: false,
        botAdmin: false,
        cooldown: 3000,
        limit: 5,
        premium: false,
    },

    /**
     * Handler Function
     */
    handler: async ({ sock, msg, args, text, prefix, command, jid, send, reply }) => {
        try {
            const startTime = performance.now();
            const mode = args[0]?.toLowerCase() || 'normal';
            
            // Send initial processing message
            await reply(config.messages.wait);
            
            // Calculate ping time
            const pingTime = Math.round(performance.now() - startTime);
            
            // Get system statistics
            const stats = await getSystemStats();
            
            // Generate response based on mode
            let response;
            switch (mode) {
                case 'detailed':
                case 'full':
                case 'كامل':
                    response = generateDetailedResponse(pingTime, stats);
                    break;
                    
                case 'server':
                case 'خادم':
                case 'system':
                    response = generateServerResponse(stats);
                    break;
                    
                case 'memory':
                case 'ram':
                case 'ذاكرة':
                    response = generateMemoryResponse(stats);
                    break;
                    
                case 'network':
                case 'شبكة':
                    response = generateNetworkResponse(pingTime, stats);
                    break;
                    
                case 'help':
                case 'مساعدة':
                    response = generateHelpResponse(prefix);
                    break;
                    
                default:
                    response = generateNormalResponse(pingTime, stats);
            }
            
            // Send response with formatted message
            await send(
                jid,
                response,
                {
                    title: getTitleByMode(mode),
                    footer: `⚡ استجابة: ${pingTime}ms`,
                    quoted: msg,
                    showName: true
                }
            );
            
            // Log ping event
            logPingEvent(msg.sender, pingTime, mode);
            
        } catch (error) {
            console.error('❌ Ping command error:', error);
            await reply(config.messages.error + `\n${error.message}`);
        }
    }
};

/**
 * 🛠️ Utility Functions
 */

/**
 * Get comprehensive system statistics
 */
async function getSystemStats() {
    const stats = {};
    
    // Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    stats.memory = {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        percentage: ((usedMem / totalMem) * 100).toFixed(2)
    };
    
    // CPU Information
    const cpus = os.cpus();
    stats.cpu = {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0,
        usage: await getCPUUsage(),
        architecture: os.arch()
    };
    
    // Uptime
    stats.uptime = {
        system: os.uptime(),
        process: process.uptime()
    };
    
    // Platform Info
    stats.platform = {
        type: os.type(),
        release: os.release(),
        version: os.version(),
        hostname: os.hostname()
    };
    
    // Node.js Info
    stats.node = {
        version: process.version,
        v8: process.versions.v8,
        pid: process.pid,
        platform: process.platform
    };
    
    // Process Info
    stats.process = {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
        argv: process.argv.length
    };
    
    // Load Average
    stats.load = os.loadavg();
    
    // Network Interfaces
    stats.network = os.networkInterfaces();
    
    // Disk Usage (if available)
    try {
        const diskStats = await getDiskUsage();
        stats.disk = diskStats;
    } catch (error) {
        stats.disk = { error: 'لا يمكن قراءة معلومات القرص' };
    }
    
    return stats;
}

/**
 * Get CPU Usage Percentage
 */
async function getCPUUsage() {
    return new Promise((resolve) => {
        const startMeasure = process.cpuUsage();
        setTimeout(() => {
            const endMeasure = process.cpuUsage(startMeasure);
            const total = (endMeasure.user + endMeasure.system) / 1000; // Convert to ms
            const percentage = (total / (100 * 1000)) * 100; // Percentage
            resolve(percentage.toFixed(2));
        }, 100);
    });
}

/**
 * Get Disk Usage Statistics
 */
async function getDiskUsage() {
    try {
        // For Linux/Unix systems
        if (process.platform !== 'win32') {
            const { stdout } = await execAsync('df -h /');
            const lines = stdout.trim().split('\n');
            const data = lines[1].split(/\s+/);
            
            return {
                total: data[1],
                used: data[2],
                free: data[3],
                percentage: data[4],
                mount: data[5]
            };
        } else {
            // For Windows systems
            const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
            const lines = stdout.trim().split('\n').slice(1);
            const disk = lines[0].split(/\s+/).filter(Boolean);
            
            const total = parseInt(disk[1]) || 0;
            const free = parseInt(disk[2]) || 0;
            const used = total - free;
            const percentage = total > 0 ? ((used / total) * 100).toFixed(2) : '0';
            
            return {
                total: formatBytes(total),
                used: formatBytes(used),
                free: formatBytes(free),
                percentage: percentage + '%'
            };
        }
    } catch (error) {
        return { error: error.message };
    }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format seconds to human readable time
 */
function formatSeconds(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    if (secs > 0) parts.push(`${secs} ثانية`);
    
    return parts.join(' ') || '0 ثانية';
}

/**
 * Get Ping Status Emoji
 */
function getPingStatus(pingTime) {
    if (pingTime < 100) return '🟢';
    if (pingTime < 300) return '🟡';
    if (pingTime < 500) return '🟠';
    return '🔴';
}

/**
 * Get CPU Status Emoji
 */
function getCPUStatus(usage) {
    const cpuUsage = parseFloat(usage);
    if (cpuUsage < 30) return '🟢';
    if (cpuUsage < 60) return '🟡';
    if (cpuUsage < 80) return '🟠';
    return '🔴';
}

/**
 * Get Memory Status Emoji
 */
function getMemoryStatus(percentage) {
    const memPercent = parseFloat(percentage);
    if (memPercent < 50) return '🟢';
    if (memPercent < 75) return '🟡';
    if (memPercent < 90) return '🟠';
    return '🔴';
}

/**
 * Get Title Based on Mode
 */
function getTitleByMode(mode) {
    const titles = {
        normal: "⚡ فحص السرعة",
        detailed: "📊 فحص مفصل",
        server: "🖥️ معلومات الخادم",
        memory: "💾 حالة الذاكرة",
        network: "🌐 حالة الشبكة",
        help: "📖 مساعدة البينغ"
    };
    
    return titles[mode] || titles.normal;
}

/**
 * Response Generators
 */

function generateNormalResponse(pingTime, stats) {
    const pingStatus = getPingStatus(pingTime);
    const cpuStatus = getCPUStatus(stats.cpu.usage);
    const memoryStatus = getMemoryStatus(stats.memory.percentage);
    
    return `
${pingStatus} *سرعة الاستجابة:* ${pingTime}ms

${cpuStatus} *وحدة المعالجة:*
  ▫️ الاستخدام: ${stats.cpu.usage}%
  ▫️ النوى: ${stats.cpu.cores}
  ▫️ النوع: ${stats.cpu.model.substring(0, 30)}...

${memoryStatus} *الذاكرة:*
  ▫️ المستخدمة: ${stats.memory.used}
  ▫️ الحرة: ${stats.memory.free}
  ▫️ الإجمالي: ${stats.memory.total}

🕐 *وقت التشغيل:*
  ▫️ النظام: ${formatSeconds(stats.uptime.system)}
  ▫️ العملية: ${formatSeconds(stats.uptime.process)}

💡 *نصائح:*
  ▫️ استخدم \`.ping detailed\` لمزيد من التفاصيل
  ▫️ استخدم \`.ping server\` لمعلومات الخادم
  ▫️ استخدم \`.ping memory\` لحالة الذاكرة
`;
}

function generateDetailedResponse(pingTime, stats) {
    const pingStatus = getPingStatus(pingTime);
    const cpuStatus = getCPUStatus(stats.cpu.usage);
    const memoryStatus = getMemoryStatus(stats.memory.percentage);
    
    const load1 = stats.load[0].toFixed(2);
    const load5 = stats.load[1].toFixed(2);
    const load15 = stats.load[2].toFixed(2);
    
    return `
${pingStatus} *📊 تقرير مفصل للأداء*

⚡ *السرعة:*
  ▫️ استجابة البوت: ${pingTime}ms
  ▫️ سرعة المعالج: ${stats.cpu.speed}MHz
  ▫️ وقت التشغيل: ${formatSeconds(stats.uptime.process)}

${cpuStatus} *🖥️ وحدة المعالجة المركزية:*
  ▫️ الاستخدام: ${stats.cpu.usage}%
  ▫️ عدد النوى: ${stats.cpu.cores}
  ▫️ النموذج: ${stats.cpu.model}
  ▫️ المعمارية: ${stats.cpu.architecture}
  
  📈 *معدل الحمل:*
    • 1 دقيقة: ${load1}
    • 5 دقائق: ${load5}
    • 15 دقيقة: ${load15}

${memoryStatus} *💾 الذاكرة:*
  ▫️ المستخدمة: ${stats.memory.used} (${stats.memory.percentage}%)
  ▫️ الحرة: ${stats.memory.free}
  ▫️ الإجمالية: ${stats.memory.total}
  
  📊 *عملية البوت:*
    • RSS: ${formatBytes(stats.process.memoryUsage.rss)}
    • Heap: ${formatBytes(stats.process.memoryUsage.heapUsed)}/${formatBytes(stats.process.memoryUsage.heapTotal)}

🌐 *الشبكة:*
  ▫️ المضيف: ${stats.platform.hostname}
  ▫️ النظام: ${stats.platform.type} ${stats.platform.release}
  ▫️ المنافذ: ${Object.keys(stats.network).length} واجهة

📦 *بيئة التشغيل:*
  ▫️ Node.js: ${stats.node.version}
  ▫️ V8 Engine: ${stats.node.v8}
  ▫️ معرف العملية: ${stats.node.pid}
`;
}

function generateServerResponse(stats) {
    const cpuStatus = getCPUStatus(stats.cpu.usage);
    const memoryStatus = getMemoryStatus(stats.memory.percentage);
    
    return `
🖥️ *معلومات الخادم المفصلة*

${cpuStatus} *مواصفات الخادم:*
  ▫️ المعالج: ${stats.cpu.model}
  ▫️ النوى: ${stats.cpu.cores} نواة
  ▫️ السرعة: ${stats.cpu.speed}MHz
  ▫️ الاستخدام الحالي: ${stats.cpu.usage}%
  ▫️ المعمارية: ${stats.cpu.architecture}

${memoryStatus} *موارد النظام:*
  ▫️ الذاكرة الكلية: ${stats.memory.total}
  ▫️ الذاكرة المستخدمة: ${stats.memory.used}
  ▫️ الذاكرة الحرة: ${stats.memory.free}
  ▫️ النسبة: ${stats.memory.percentage}%

💿 *مساحة التخزين:*
  ${stats.disk.error ? `▫️ ${stats.disk.error}` : `
  ▫️ الإجمالية: ${stats.disk.total}
  ▫️ المستخدمة: ${stats.disk.used}
  ▫️ الحرة: ${stats.disk.free}
  ▫️ النسبة: ${stats.disk.percentage}`}

🌐 *معلومات الشبكة:*
  ▫️ اسم المضيف: ${stats.platform.hostname}
  ▫️ نظام التشغيل: ${stats.platform.type}
  ▫️ الإصدار: ${stats.platform.release}
  ▫️ الوقت: ${new Date().toLocaleString('ar-SA')}

📊 *أحمال النظام:*
  ▫️ 1 دقيقة: ${stats.load[0].toFixed(2)}
  ▫️ 5 دقائق: ${stats.load[1].toFixed(2)}
  ▫️ 15 دقيقة: ${stats.load[2].toFixed(2)}
`;
}

function generateMemoryResponse(stats) {
    const memoryStatus = getMemoryStatus(stats.memory.percentage);
    
    // Create memory usage bar
    const percentage = parseFloat(stats.memory.percentage);
    const barLength = 20;
    const filled = Math.round((percentage / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    
    return `
${memoryStatus} *تحليل مفصل للذاكرة*

📊 *إحصائيات الذاكرة:*
  ▫️ النسبة: ${percentage}% ${bar}
  ▫️ المستخدمة: ${stats.memory.used}
  ▫️ الحرة: ${stats.memory.free}
  ▫️ الإجمالية: ${stats.memory.total}

🔍 *ذاكرة عملية البوت:*
  ▫️ RSS: ${formatBytes(stats.process.memoryUsage.rss)}
  ▫️ Heap Total: ${formatBytes(stats.process.memoryUsage.heapTotal)}
  ▫️ Heap Used: ${formatBytes(stats.process.memoryUsage.heapUsed)}
  ▫️ External: ${formatBytes(stats.process.memoryUsage.external)}
  ▫️ Array Buffers: ${formatBytes(stats.process.memoryUsage.arrayBuffers)}

📈 *تحليل الأداء:*
  ▫️ استخدام الذاكرة: ${percentage < 70 ? '🟢 ممتاز' : percentage < 85 ? '🟡 جيد' : '🔴 مرتفع'}
  ▫️ توصية: ${percentage > 85 ? 'تحتاج إلى تنظيف الذاكرة' : 'الحالة مستقرة'}
  
💡 *نصائح التحسين:*
  ${percentage > 85 ? '▫️ أعد تشغيل البوت لتنظيف الذاكرة\n  ▫️ قم بتقليل عدد الإضافات النشطة\n  ▫️ نظف الملفات المؤقتة' : '▫️ الحالة ممتازة، لا حاجة لإجراءات'}
`;
}

function generateNetworkResponse(pingTime, stats) {
    const pingStatus = getPingStatus(pingTime);
    const networkInterfaces = stats.network;
    
    let networkInfo = '';
    Object.keys(networkInterfaces).forEach((iface) => {
        const addresses = networkInterfaces[iface]
            .filter(addr => addr.family === 'IPv4')
            .map(addr => `    • ${addr.address} (${addr.netmask})`)
            .join('\n');
        
        if (addresses) {
            networkInfo += `▫️ ${iface}:\n${addresses}\n`;
        }
    });
    
    return `
${pingStatus} *تحليل الشبكة والأداء*

⚡ *سرعة الاستجابة:*
  ▫️ Ping Time: ${pingTime}ms
  ▫️ الحالة: ${pingTime < 100 ? 'ممتازة' : pingTime < 300 ? 'جيدة' : 'بطيئة'}

🌐 *معلومات الشبكة:*
${networkInfo || '  ▫️ لا توجد معلومات متاحة'}

🖥️ *معلومات النظام:*
  ▫️ نظام التشغيل: ${stats.platform.type}
  ▫️ الإصدار: ${stats.platform.release}
  ▫️ اسم المضيف: ${stats.platform.hostname}

📡 *جودة الاتصال:*
  ▫️ توصيات: ${pingTime > 500 ? 'تحقق من اتصال الإنترنت' : 'الاتصال ممتاز'}
  ▫️ سرعة التحميل: ${estimateSpeed(pingTime)}
`;
}

function generateHelpResponse(prefix) {
    return `
📖 *أوامر فحص البينغ المتقدمة*

${prefix}ping - فحص السرعة الأساسي
${prefix}ping detailed - فحص مفصل شامل
${prefix}ping server - معلومات الخادم
${prefix}ping memory - تحليل الذاكرة
${prefix}ping network - حالة الشبكة

🔍 *ماذا تفحص كل أمر:*
▫️ *detailed*: سرعة + معالج + ذاكرة + شبكة + نظام
▫️ *server*: مواصفات الخادم وموارده
▫️ *memory*: تحليل مفصل لاستخدام الذاكرة
▫️ *network*: سرعة الاتصال ومعلومات الشبكة

💡 *نصائح:*
▫️ Ping < 100ms: 🟢 ممتاز
▫️ Ping 100-300ms: 🟡 جيد
▫️ Ping 300-500ms: 🟠 مقبول
▫️ Ping > 500ms: 🔴 بطيء

⚡ *لمزيد من الأوامر:* ${prefix}menu
`;
}

/**
 * Helper Functions
 */
function estimateSpeed(pingTime) {
    if (pingTime < 50) return '🔵 فائق السرعة (أكثر من 100 ميجابت)';
    if (pingTime < 100) return '🟢 عالي السرعة (50-100 ميجابت)';
    if (pingTime < 200) return '🟡 متوسط السرعة (20-50 ميجابت)';
    if (pingTime < 400) return '🟠 منخفض السرعة (5-20 ميجابت)';
    return '🔴 بطيء (أقل من 5 ميجابت)';
}

/**
 * Log ping events for analytics
 */
async function logPingEvent(sender, pingTime, mode) {
    try {
        const logEntry = {
            timestamp: new Date().toISOString(),
            sender: sender.split('@')[0],
            pingTime,
            mode,
            date: new Date().toLocaleDateString('ar-SA'),
            time: new Date().toLocaleTimeString('ar-SA')
        };
        
        // Append to log file
        const logFile = './logs/ping-stats.json';
        let logs = [];
        
        try {
            const data = await fs.readFile(logFile, 'utf8');
            logs = JSON.parse(data);
        } catch (error) {
            logs = [];
        }
        
        logs.push(logEntry);
        
        // Keep only last 1000 entries
        if (logs.length > 1000) {
            logs = logs.slice(-1000);
        }
        
        await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
        
    } catch (error) {
        // Silent fail for logging
    }
}

/**
 * Generate ASCII Progress Bar
 */
function generateProgressBar(percentage, length = 20) {
    const filled = Math.round((percentage / 100) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
    }
