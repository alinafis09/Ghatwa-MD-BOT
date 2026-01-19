const axios = require('axios');
const { sendChannelMessage } = require('../lib/send'); // إلى بغيت القناة فالنص/الصورة

module.exports = {
  command: 'tt',

  handler: async (sock, m, text, args) => {
    const url = args[0];

    if (!url) {
      return sock.sendMessage(
        m.key.remoteJid,
        { text: '❌ حط رابط TikTok\nمثال:\n.tt https://vt.tiktok.com/xxxx' },
        { quoted: m }
      );
    }

    try {
      // رسالة انتظار (تقدر تخليها بالقناة إلى بغيت)
      await sock.sendMessage(
        m.key.remoteJid,
        { text: '⏳ كنحمّل الفيديو… صبر شوية' },
        { quoted: m }
      );

      // API موثوق
      const { data } = await axios.get(
        `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`
      );

      if (!data || !data.video || !data.video.noWatermark) {
        throw new Error('Invalid API response');
      }

      // إرسال الفيديو (بدون علامة مائية)
      await sock.sendMessage(
        m.key.remoteJid,
        {
          video: { url: data.video.noWatermark },
          caption: '✅ تم التحميل بنجاح'
        },
        { quoted: m }
      );

    } catch (e) {
      console.error('TT ERROR:', e.message);
      await sock.sendMessage(
        m.key.remoteJid,
        { text: '❌ فشل التحميل. جرّب رابط آخر أو عاود من بعد.' },
        { quoted: m }
      );
    }
  }
};
