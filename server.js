require('dotenv').config();
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25', 10);
const SMTP_PORT_ALT = parseInt(process.env.SMTP_PORT_ALT || '2525', 10);
const EMAIL_USER = process.env.EMAIL_USER || 'rudra@adiance.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'esbn cctj ckxj ysep';
const RELAY_ENABLED = process.env.RELAY_ENABLED !== 'false';

const SAVE_DIR = path.join(__dirname, 'received_emails');
if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

// Nodemailer transporter for Gmail relay
const relayTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS.replace(/\s+/g, '') // remove spaces from Gmail App Password
  }
});

// Verify relay connection on start
relayTransporter.verify((err, success) => {
  if (err) {
    console.warn(`[SMTP Relay] Gmail verify warning: ${err.message}`);
  } else {
    console.log(`[SMTP Relay] ✅ Connected to Gmail as ${EMAIL_USER}`);
  }
});

function createServerInstance(port) {
  const server = new SMTPServer({
    disabledCommands: ['STARTTLS'], // Simple unencrypted local SMTP for camera
    authOptional: true,
    size: 25 * 1024 * 1024, // 25 MB max

    onAuth(auth, session, callback) {
      console.log(`[SMTP] Auth attempt by: ${auth.username}`);
      return callback(null, { user: auth.username });
    },

    onConnect(session, callback) {
      console.log(`[SMTP] Client connected from ${session.remoteAddress}`);
      return callback();
    },

    onMailFrom(address, session, callback) {
      console.log(`[SMTP] Mail from: ${address.address}`);
      return callback();
    },

    onRcptTo(address, session, callback) {
      console.log(`[SMTP] Mail to: ${address.address}`);
      return callback();
    },

    onData(stream, session, callback) {
      simpleParser(stream, {}, async (err, parsed) => {
        if (err) {
          console.error('[SMTP] Parse error:', err.message);
          return callback(err);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const emailLog = {
          time: new Date().toISOString(),
          from: parsed.from ? parsed.from.text : session.envelope.mailFrom.address,
          to: parsed.to ? parsed.to.text : session.envelope.rcptTo.map(r => r.address).join(', '),
          subject: parsed.subject,
          text: parsed.text,
          attachmentsCount: parsed.attachments ? parsed.attachments.length : 0
        };

        console.log(`\n================== [SMTP EMAIL RECEIVED] ==================`);
        console.log(`Time:    ${emailLog.time}`);
        console.log(`From:    ${emailLog.from}`);
        console.log(`To:      ${emailLog.to}`);
        console.log(`Subject: ${emailLog.subject}`);
        console.log(`===========================================================\n`);

        // Save email metadata and body
        const logFile = path.join(SAVE_DIR, `email_${timestamp}.json`);
        fs.writeFileSync(logFile, JSON.stringify(emailLog, null, 2));

        // Save attachments (camera snapshots)
        if (parsed.attachments && parsed.attachments.length > 0) {
          parsed.attachments.forEach((att, idx) => {
            const safeName = att.filename ? att.filename.replace(/[^a-zA-Z0-9._-]/g, '_') : `attachment_${idx}.jpg`;
            const attPath = path.join(SAVE_DIR, `${timestamp}_${safeName}`);
            fs.writeFileSync(attPath, att.content);
            console.log(`[SMTP] 📷 Saved snapshot attachment: ${attPath} (${att.size} bytes)`);
          });
        }

        // Relay through Gmail if enabled
        if (RELAY_ENABLED) {
          console.log(`[SMTP Relay] 🚀 Forwarding email to ${emailLog.to} via Gmail...`);
          try {
            const mailOptions = {
              from: `"Camera Alert" <${EMAIL_USER}>`,
              to: emailLog.to,
              subject: parsed.subject || 'Camera Alert Notification',
              text: parsed.text || 'Camera alert notification received.',
              attachments: (parsed.attachments || []).map(a => ({
                filename: a.filename || 'snapshot.jpg',
                content: a.content,
                contentType: a.contentType
              }))
            };

            const info = await relayTransporter.sendMail(mailOptions);
            console.log(`[SMTP Relay] ✅ Forwarded successfully! Message ID: ${info.messageId}`);
          } catch (relayErr) {
            console.error(`[SMTP Relay] ❌ Relay failed:`, relayErr.message);
          }
        }

        return callback(null, 'OK: Message accepted');
      });
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`📧 SMTP Server is listening on port ${port} (0.0.0.0:${port})`);
  });

  server.on('error', (err) => {
    console.error(`[SMTP Port ${port}] Error:`, err.message);
  });

  return server;
}

console.log(`====================================================`);
console.log(`🚀 Starting SMTP Server with Gmail Relay`);
console.log(`Sender Account: ${EMAIL_USER}`);
console.log(`====================================================`);

// Listen on primary port 25 and alternate port 2525
createServerInstance(SMTP_PORT);
if (SMTP_PORT_ALT && SMTP_PORT_ALT !== SMTP_PORT) {
  createServerInstance(SMTP_PORT_ALT);
}

