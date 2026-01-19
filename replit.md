# WhatsApp Bot

## Overview

This is a WhatsApp bot built using the Baileys library (@whiskeysockets/baileys). The bot connects to WhatsApp Web using a pairing code authentication method and supports a plugin-based command system. Users can send commands prefixed with a dot (.) to trigger bot functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Components

**Entry Point (index.js)**
- Handles WhatsApp Web connection using Baileys library
- Manages authentication state using multi-file auth stored in `./Botsession` directory
- Implements pairing code flow for device linking (no QR code scanning required)
- Uses pino logger in silent mode to reduce console noise

**Message Handler (main.js)**
- Plugin loader that dynamically loads command modules from the `plugins/` directory
- Exports a function that takes the socket connection and sets up message event listeners
- Commands are triggered by messages starting with `.` (configurable prefix in config.js)
- Supports hot-reloading by clearing require cache when loading plugins

**Configuration (config.js)**
- Centralized configuration for owner phone number, bot name, and command prefix
- Uses CommonJS module format

### Plugin System

Plugins are JavaScript files placed in the `plugins/` directory with the following structure:
- Must export `command` (string) - the command name
- Must export `handler` (async function) - receives `(sock, msg, text, args)`

### Authentication & Session

- Sessions are persisted in the `Botsession/` directory as JSON files
- Uses Signal Protocol keys for end-to-end encryption
- Pre-keys, identity keys, and app state sync data are stored locally
- Browser identification spoofs macOS Chrome

### Design Decisions

1. **Pairing Code over QR**: Easier for headless/server deployments where scanning QR codes isn't practical
2. **Plugin Architecture**: Allows adding new commands without modifying core code
3. **File-based Session Storage**: Simple persistence without requiring a database
4. **Silent Logging**: Reduces noise in production while Baileys can be verbose

## External Dependencies

### NPM Packages

| Package | Purpose |
|---------|---------|
| @whiskeysockets/baileys | WhatsApp Web API client library |
| pino | Fast JSON logger (used in silent mode) |
| qrcode-terminal | QR code display (installed but not actively used due to pairing code preference) |
| readline | Interactive command-line input for pairing flow |

### External Services

- **WhatsApp Web**: The bot connects to WhatsApp's servers using the Baileys library's WebSocket connection
- No database required - all state is file-based
- No external APIs configured by default

### File Storage

- `./Botsession/`: Authentication credentials and encryption keys
- `./plugins/`: Command plugin modules (directory created automatically if missing)