import express from "express";
import multer from "multer";
import QRCode from "qrcode";
import P from "pino";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 100);

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = path.join(ROOT, "uploads");
const AUTH = path.join(ROOT, "auth");

for (const dir of [UPLOADS, AUTH]) fs.mkdirSync(dir, { recursive: true });

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC));

const upload = multer({
  dest: UPLOADS,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 }
});

const logger = P({ level: process.env.LOG_LEVEL || "info" });

let sock = null;
let qrDataUrl = null;
let connectionState = "starting";
let connectedNumber = null;
let reconnectTimer = null;

function safeUnlink(file) {
  try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
}

function status() {
  return {
    connected: connectionState === "open",
    state: connectionState,
    number: connectedNumber
  };
}

async function startWhatsApp() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH);

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    version = undefined;
  }

  sock = makeWASocket({
    auth: state,
    version,
    logger,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      try {
        qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 320 });
      } catch {
        qrDataUrl = null;
      }
      connectionState = "qr";
    }

    if (connection === "open") {
      connectionState = "open";
      qrDataUrl = null;
      connectedNumber = sock.user?.id?.split(":")[0] || sock.user?.id || null;
      console.log(`WhatsApp connected: ${connectedNumber}`);
    }

    if (connection === "close") {
      connectionState = "closed";
      connectedNumber = null;

      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;

      if (!loggedOut) {
        reconnectTimer = setTimeout(startWhatsApp, 3000);
      }
    }
  });
}

async function ensureConnected() {
  if (!sock || connectionState !== "open") {
    throw new Error("WhatsApp belum terhubung. Hubungkan akun lewat QR terlebih dahulu.");
  }
}

/*
  Important:
  WhatsApp Status is represented by status@broadcast.
  This project intentionally does not modify the selected media in the browser.
  WhatsApp may still transcode/compress media after receiving it.
*/
async function sendStatus(file, caption = "") {
  await ensureConnected();

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype || "";

  let message;
  const common = {
    caption: caption || undefined
  };

  if (mime.startsWith("image/")) {
    message = {
      image: { url: file.path },
      ...common
    };
  } else if (mime.startsWith("video/")) {
    message = {
      video: { url: file.path },
      ...common
    };
  } else {
    throw new Error("Hanya gambar atau video yang didukung.");
  }

  /*
    statusJidList is left empty here so the account's WhatsApp status
    privacy settings remain the source of truth for the audience.
  */
  return await sock.sendMessage(
    "status@broadcast",
    message,
    {
      broadcast: true,
      statusJidList: []
    }
  );
}

app.get("/api/status", (req, res) => {
  res.json(status());
});

app.get("/api/qr", (req, res) => {
  if (connectionState === "open") {
    return res.json({ connected: true, qr: null });
  }
  res.json({ connected: false, qr: qrDataUrl, state: connectionState });
});

app.post("/api/upload-status", upload.single("media"), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ ok: false, error: "Tidak ada file." });
  }

  try {
    await ensureConnected();

    const caption = String(req.body.caption || "").slice(0, 500);
    const result = await sendStatus(file, caption);

    res.json({
      ok: true,
      messageId: result?.key?.id || null,
      message: "Status berhasil dikirim ke WhatsApp."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err?.message || "Gagal mengirim status."
    });
  } finally {
    safeUnlink(file.path);
  }
});

app.post("/api/logout", async (req, res) => {
  try {
    if (sock) {
      try { await sock.logout(); } catch {}
    }
    sock = null;
    connectionState = "starting";
    connectedNumber = null;
    qrDataUrl = null;

    fs.rmSync(AUTH, { recursive: true, force: true });
    fs.mkdirSync(AUTH, { recursive: true });

    res.json({ ok: true });
    setTimeout(startWhatsApp, 500);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      ok: false,
      error: `File terlalu besar. Maksimum ${MAX_FILE_MB} MB.`
    });
  }
  console.error(err);
  res.status(500).json({ ok: false, error: "Kesalahan server." });
});

app.listen(PORT, () => {
  console.log(`Website: http://localhost:${PORT}`);
  console.log("Starting WhatsApp connection...");
  startWhatsApp().catch(console.error);
});
