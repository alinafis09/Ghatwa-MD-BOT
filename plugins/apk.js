const axios = require('axios');

module.exports = {
    command: "apk",
    handler: async (sock, msg, text, args, jid) => {
        if (!text) return sock.sendMessage(jid, { text: '❌ يرجى كتابة اسم التطبيق بعد الأمر' }, { quoted: msg });

        try {
            await sock.sendMessage(jid, { text: '⏳ جاري البحث عن التطبيق وتحميله...' }, { quoted: msg });

            // البحث عن التطبيق
            const searchRes = await axios.get(`https://api.maher-zubair.tech/download/apk?q=${encodeURIComponent(text)}`);
            const res = searchRes.data.result;

            if (!res || !res.dllink) {
                return sock.sendMessage(jid, { text: '❌ تعذر العثور على التطبيق، جرب اسماً آخر.' }, { quoted: msg });
            }

            const caption = `📢 *[ APK DOWNLOADER ]*\n\n` +
                            `📦 *الاسم:* ${res.name}\n` +
                            `🆔 *الحزمة:* ${res.id}\n` +
                            `⚖️ *الحجم:* ${res.size}\n` +
                            `📅 *آخر تحديث:* ${res.lastup}\n\n` +
                            `🤖 *بواسطة بوتك*`;

            // إرسال الأيقونة والمعلومات
            await sock.sendMessage(jid, { 
                image: { url: res.icon }, 
                caption: caption 
            }, { quoted: msg });

            // إرسال ملف APK
            await sock.sendMessage(jid, { 
                document: { url: res.dllink }, 
                mimetype: 'application/vnd.android.package-archive', 
                fileName: `${res.name}.apk` 
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(jid, { text: '❌ حدث خطأ أثناء التحميل.' }, { quoted: msg });
        }
    }
};
