const config = require('../config');

module.exports = {
    command: 'owner',
    handler: async (sock, msg, text, args) => {
        const ownerText = `
👤 *معلومات المطور*

👨‍💼 الاسم: ${config.ownerName}
📱 الرقم: wa.me/${config.ownerNumber}
💬 تواصل معي لأي استفسار أو اقتراح.
`;

        await sock.sendMessage(msg.key.remoteJid, { 
            text: ownerText,
            contextInfo: {
                externalAdReply: {
                    title: 'Owner Information',
                    body: config.botName,
                    thumbnailUrl: config.menuImage || 'https://i.imgur.com/example.jpg',
                    sourceUrl: config.channelLink || '',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });
    }
};
