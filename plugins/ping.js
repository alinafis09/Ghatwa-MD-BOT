const config = require('../config');

module.exports = {
    command: 'ping',
    handler: async (sock, msg, text, args) => {
        const start = Date.now();
        const response = `🚀 *${config.botName}* استجابة:\n⏱️ السرعة: ${Date.now() - start}ms`;
        
        await sock.sendMessage(msg.key.remoteJid, { 
            text: response,
            contextInfo: {
                externalAdReply: {
                    title: config.botName,
                    body: 'Bot Speed Test',
                    thumbnailUrl: config.menuImage || 'https://i.imgur.com/example.jpg',
                    sourceUrl: config.channelLink || '',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });
    }
};

