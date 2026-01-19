const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, delay, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const config = require('./config');

const logger = pino({ level: 'silent' });

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

async function startBot() {
    console.log('\n==========================================');
    console.log('   WhatsApp Bot - Initialization');
    console.log('==========================================\n');

    const { state, saveCreds } = await useMultiFileAuthState('./Botsession');

    const sock = makeWASocket({
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: Browsers.macOS("Chrome"),
        markOnlineOnConnect: true
    });

    if (!sock.authState.creds.registered) {
        console.log('\n--- Pairing Mode Activated ---');
        const phoneNumber = await question('Enter your phone number with country code (e.g., 212624052666): ');
        try {
            console.log('\nRequesting pairing code...');
            await delay(5000);
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log('\n==========================================');
            console.log(`   YOUR PAIRING CODE: ${code}`);
            console.log('==========================================\n');
            console.log('Instructions:');
            console.log('1. Open WhatsApp on your phone.');
            console.log('2. Go to Linked Devices > Link a Device.');
            console.log('3. Select "Link with phone number instead".');
            console.log('4. Enter the 8-character code shown above.\n');
        } catch (e) {
            console.error('\n❌ Error requesting pairing code:', e.message);
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Connection closed. Reconnecting...');
                startBot();
            } else {
                console.log('Logged out. Please delete the Botsession folder and restart.');
            }
        } else if (connection === 'open') {
            console.log('\n✅ WhatsApp Bot is ONLINE and ready!');
            
            // Notify Owner
            if (config.ownerNumber) {
                const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;
                try {
                    await sock.sendMessage(ownerJid, { text: "✅ البوت خدام دابا بنجاح!" });
                    console.log(`Notification sent to owner: ${config.ownerNumber}`);
                } catch (e) {
                    console.error('Failed to notify owner:', e.message);
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Call main logic
    require('./main.js')(sock);
}

startBot();
