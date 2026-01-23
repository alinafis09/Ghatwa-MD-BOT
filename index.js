import makeWASocket, {

  useMultiFileAuthState,

  DisconnectReason,

  Browsers,

  delay,

  makeCacheableSignalKeyStore

} from "@whiskeysockets/baileys"

import pino from "pino"

import readline from "readline"

import config from "./config.js"

import main from "./main.js"

/* ========= LOGGER ========= */

const logger = pino({ level: "silent" })

/* ========= TERMINAL QUESTION ========= */

const question = (text) => {

  const rl = readline.createInterface({

    input: process.stdin,

    output: process.stdout

  })

  return new Promise(resolve => {

    rl.question(text, answer => {

      rl.close()

      resolve(answer)

    })

  })

}

/* ========= FORMAT UPTIME ========= */

function formatUptime(ms) {

  const s = Math.floor(ms / 1000)

  const h = Math.floor(s / 3600)

  const m = Math.floor((s % 3600) / 60)

  const sec = s % 60

  return `${h}h ${m}m ${sec}s`

}

/* ========= START BOT ========= */

async function startBot() {

  const startTime = Date.now()

  const { state, saveCreds } = await useMultiFileAuthState("./Botsession")

  const sock = makeWASocket({

    logger,

    printQRInTerminal: false,

    auth: {

      creds: state.creds,

      keys: makeCacheableSignalKeyStore(state.keys, logger)

    },

    browser: Browsers.macOS("Chrome"),

    markOnlineOnConnect: true

  })

  /* ========= PAIRING ========= */

  if (!state.creds.registered && config.pairingCode) {

    const phone = await question("📱 Enter phone number (2126xxxxxxx): ")

    await delay(2000)

    const code = await sock.requestPairingCode(phone.trim())

    console.log("✅ PAIRING CODE:", code)

  }

  /* ========= UPDATE ABOUT (UPTIME) ========= */

  setInterval(async () => {

    if (!sock.user) return

    const uptime = formatUptime(Date.now() - startTime)

    try {

      await sock.updateProfileStatus(

        `🤖 ${config.botName}\n⏱ Uptime: ${uptime}`

      )

    } catch {}

  }, 1000)

  /* ========= CONNECTION EVENTS ========= */

  sock.ev.on("connection.update", (update) => {

    const { connection, lastDisconnect } = update

    if (connection === "close") {

      const shouldReconnect =

        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      if (shouldReconnect) startBot()

    }

    if (connection === "open") {

      console.log("✅ BOT ONLINE")

      if (config.ownerNumber) {

        const ownerJid = `${config.ownerNumber}@s.whatsapp.net`

        sock.sendMessage(ownerJid, {

          text: "✅ البوت خدام دابا بنجاح 🤖"

        }).catch(() => {})

      }

    }

  })

  sock.ev.on("creds.update", saveCreds)

  /* ========= LOAD COMMANDS ========= */

  main(sock)

}

/* ========= RUN ========= */

startBot()
