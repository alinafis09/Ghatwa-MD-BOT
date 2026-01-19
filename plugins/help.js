
const config = require('../config');

module.exports = {
    command: 'help',
    handler: async (sock, msg, text, args) => {
        const helpText = `
🌟 *${config.botName} - قائمة الأوامر* 🌟

📍 *الأوامر المتوفرة:*
1. *.ping* - فحص سرعة استجابة البوت
2. *.help* - عرض هذه القائمة
3. *.owner* - معلومات المطور

---
👨‍💻 مطور البوت: ${config.ownerName}
🔗 رابط القناة: ${config.channelLink}
`;

        await sock.sendMessage(msg.key.remoteJid, { 
            text: helpText,
            contextInfo: {
                externalAdReply: {
                    title: 'Help Menu',
                    body: config.botName,
                    thumbnailUrl: config.menuImage || 'https://i.imgur.com/example.jpg',
                    sourceUrl: config.groupLink || '',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });
    }
};
