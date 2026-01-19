const fs = require('fs');
const path = require('path');

module.exports = (sock) => {
    const plugins = new Map();
    const pluginsDir = path.join(__dirname, 'plugins');

    // Plugin Loader
    const loadPlugins = () => {
        if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir);
        
        const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
        for (const file of files) {
            const pluginPath = path.join(pluginsDir, file);
            try {
                // Clear cache for hot-reloading if needed
                delete require.cache[require.resolve(pluginPath)];
                const plugin = require(pluginPath);
                if (plugin.command && plugin.handler) {
                    plugins.set(plugin.command.toLowerCase(), plugin);
                    console.log(`Successfully registered command: ${plugin.command}`);
                }
            } catch (e) {
                console.error(`Failed to load plugin ${file}:`, e.message);
            }
        }
    };

    loadPlugins();

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || 
                     msg.message.imageMessage?.caption || '';
        
        if (!text.startsWith('.')) return;

        const args = text.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (plugins.has(command)) {
            try {
                await plugins.get(command).handler(sock, msg, text, args);
            } catch (e) {
                console.error(`Error executing command ${command}:`, e);
            }
        }
    });
};
