# SMTP Alert Server with Gmail Relay for IP Cameras

A dedicated SMTP server designed to receive email alerts from IP cameras, parse the message, extract attached JPEG snapshots, archive them locally, and automatically forward the alert to destination inboxes via Gmail SMTP.

## Features
- **Local Camera Compatibility:** Accepts plain SMTP connections from cameras on port 25 or 2525 without requiring complex on-camera TLS setup.
- **Gmail Relay Forwarding:** Automatically relays alerts to recipients using Gmail TLS / App Password.
- **Snapshot Extraction:** Automatically detects and extracts JPEG snapshot attachments into `./received_emails/`.
- **JSON Metadata Archiving:** Records time, sender, recipient, subject, and text for every event.
- **PM2 Ready:** Background process management with auto-restart.

---

## Installation & Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/irudrapatel/SMTP_Server.git
   cd SMTP_Server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set your Gmail account and 16-character App Password:
   ```env
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx
   ```

4. **Grant port 25 binding capability (Linux non-root):**
   ```bash
   sudo setcap 'cap_net_bind_service=+ep' $(which node)
   ```

5. **Run directly:**
   ```bash
   node server.js
   ```

6. **Run with PM2:**
   ```bash
   pm2 start server.js --name smtp-server
   pm2 save
   ```

---

## Camera Configuration (Novatek Web UI)

Open the camera web interface and navigate to **Event > Notification > E-mail**:

| Field | Value |
| :--- | :--- |
| **Enable Email** | `ON` |
| **SMTP Server** | Your Server IP (e.g. `192.168.7.158`) |
| **SMTP Port** | `25` (or `2525`) |
| **Encryption** | `None` |
| **Sender Email** | `rudra@adiance.com` |
| **Username** | *(Leave empty)* |
| **Password** | *(Leave empty)* |
| **Send Mode** | `Picture` (attaches snapshot) |
| **Receiver Address** | `recipient@example.com` |
| **Interval** | `60` seconds |

---

## License
MIT
