import fs from 'fs/promises';
import config from '../config.js';

export default {
    command: "pingstats",
    aliases: ["pingstat", "pinglog", "pingstats"],
    category: ["tools"],
    description: "عرض إحصائيات فحوصات البينغ",
    usage: ".pingstats [today/week/month/all]",
    
    handler: async ({ sock, msg, args, jid, send }) => {
        try {
            const period = args[0]?.toLowerCase() || 'today';
            const stats = await getPingStats(period);
            
            const response = generateStatsResponse(stats, period);
            
            await send(
                jid,
                response,
                {
                    title: "📊 إحصائيات فحوصات البينغ",
                    quoted: msg
                }
            );
            
        } catch (error) {
            console.error('Ping stats error:', error);
            await send(jid, config.messages.error, { quoted: msg });
        }
    }
};

async function getPingStats(period) {
    try {
        const logFile = './logs/ping-stats.json';
        const data = await fs.readFile(logFile, 'utf8');
        const logs = JSON.parse(data);
        
        const now = new Date();
        let filteredLogs = logs;
        
        switch (period) {
            case 'today':
                filteredLogs = logs.filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate.toDateString() === now.toDateString();
                });
                break;
                
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filteredLogs = logs.filter(log => new Date(log.timestamp) >= weekAgo);
                break;
                
            case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                filteredLogs = logs.filter(log => new Date(log.timestamp) >= monthAgo);
                break;
        }
        
        if (filteredLogs.length === 0) {
            return { total: 0, average: 0, best: 0, worst: 0, modes: {} };
        }
        
        const pingTimes = filteredLogs.map(log => log.pingTime);
        const average = pingTimes.reduce((a, b) => a + b, 0) / pingTimes.length;
        const best = Math.min(...pingTimes);
        const worst = Math.max(...pingTimes);
        
        // Count modes
        const modes = {};
        filteredLogs.forEach(log => {
            modes[log.mode] = (modes[log.mode] || 0) + 1;
        });
        
        return {
            total: filteredLogs.length,
            average: Math.round(average),
            best,
            worst,
            modes,
            period
        };
        
    } catch (error) {
        return { error: error.message };
    }
}

function generateStatsResponse(stats, period) {
    if (stats.error) {
        return `❌ حدث خطأ في قراءة الإحصائيات:\n${stats.error}`;
    }
    
    if (stats.total === 0) {
        return `📭 لا توجد سجلات فحوصات للفترة: ${getPeriodName(period)}`;
    }
    
    const periodName = getPeriodName(period);
    
    return `
📊 *إحصائيات فحوصات البينغ (${periodName})*

🔢 *الأرقام:*
  ▫️ العدد الإجمالي: ${stats.total} فحص
  ▫️ المتوسط: ${stats.average}ms
  ▫️ أفضل سرعة: ${stats.best}ms
  ▫️ أسوأ سرعة: ${stats.worst}ms

📈 *توزيع الأنواع:*
${Object.entries(stats.modes).map(([mode, count]) => 
    `  ▫️ ${mode}: ${count} مرة (${((count / stats.total) * 100).toFixed(1)}%)`
).join('\n')}

🏆 *التقييم العام:*
  ▫️ الأداء: ${getPerformanceRating(stats.average)}
  ▫️ الاستقرار: ${getStabilityRating(stats.worst - stats.best)}
  
💡 *تحليل:*
  ${stats.average < 100 ? '⚡ الأداء ممتاز' : 
    stats.average < 300 ? '✅ الأداء جيد' : 
    '⚠️ يحتاج إلى تحسين'}

📅 آخر تحديث: ${new Date().toLocaleString('ar-SA')}
`;
}

function getPeriodName(period) {
    const names = {
        today: 'اليوم',
        week: 'أخر أسبوع',
        month: 'أخر شهر',
        all: 'الكل'
    };
    return names[period] || period;
}

function getPerformanceRating(average) {
    if (average < 100) return '🟢 ممتاز';
    if (average < 200) return '🟡 جيد';
    if (average < 400) return '🟠 مقبول';
    return '🔴 ضعيف';
}

function getStabilityRating(range) {
    if (range < 50) return '🟢 مستقر جداً';
    if (range < 100) return '🟡 مستقر';
    if (range < 200) return '🟠 متغير';
    return '🔴 غير مستقر';
}
