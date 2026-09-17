import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import { Boom } from "@hapi/boom";
import P from "pino";
import QRCode from "qrcode";

const logger = P({
  level: "silent"
});

let sock = null;
let qrData = null;
let connectionState = "disconnected";
let reconnecting = false;

export async function startWhatsApp() {
  if (reconnecting) return;

  reconnecting = true;

  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("./auth");

    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,

      auth: state,

      logger,

      browser: [
        "Baileys Status Web",
        "Chrome",
        "1.0.0"
      ],

      generateHighQualityLinkPreview: false,

      markOnlineOnConnect: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const {
        connection,
        lastDisconnect,
        qr
      } = update;

      if (qr) {
        qrData = await QRCode.toDataURL(qr);
        connectionState = "qr";
      }

      if (connection === "connecting") {
        connectionState = "connecting";
      }

      if (connection === "open") {
        connectionState = "connected";
        qrData = null;
        reconnecting = false;

        console.log("WhatsApp connected");
      }

      if (connection === "close") {
        connectionState = "disconnected";

        const statusCode =
          new Boom(lastDisconnect?.error)?.output?.statusCode;

        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut;

        console.log(
          "WhatsApp disconnected:",
          statusCode
        );

        reconnecting = false;

        if (shouldReconnect) {
          setTimeout(() => {
            startWhatsApp();
          }, 3000);
        } else {
          console.log(
            "Session logged out. Delete ./auth and pair again."
          );
        }
      }
    });

  } catch (error) {
    reconnecting = false;

    console.error(
      "Failed to start WhatsApp:",
      error
    );

    setTimeout(startWhatsApp, 5000);
  }
}

export function getWhatsAppStatus() {
  return {
    connected: connectionState === "connected",
    state: connectionState,
    qr: qrData
  };
}

export async function sendStatus({
  filePath,
  mimeType,
  caption = ""
}) {
  if (!sock || connectionState !== "connected") {
    throw new Error(
      "WhatsApp belum terhubung."
    );
  }

  if (!mimeType) {
    throw new Error(
      "MIME type file tidak diketahui."
    );
  }

  const isImage =
    mimeType.startsWith("image/");

  const isVideo =
    mimeType.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error(
      "Hanya foto dan video yang didukung."
    );
  }

  let content;

  if (isImage) {
    content = {
      image: {
        url: filePath
      },

      ...(caption
        ? { caption }
        : {})
    };
  }

  if (isVideo) {
    content = {
      video: {
        url: filePath
      },

      ...(caption
        ? { caption }
        : {})
    };
  }

  /*
   * status@broadcast = WhatsApp Status/Story
   *
   * broadcast: true mengaktifkan mode broadcast.
   *
   * statusJidList:
   *   [] berarti tidak menentukan daftar penerima
   *   secara eksplisit.
   *
   * Catatan:
   * Perilaku distribusi Status dapat berubah
   * mengikuti implementasi WhatsApp/Baileys.
   */

  const result = await sock.sendMessage(
    "status@broadcast",
    content,
    {
      broadcast: true,
      statusJidList: []
    }
  );

  return result;
}
