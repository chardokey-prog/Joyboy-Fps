import "dotenv/config";

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mime from "mime-types";

import {
  startWhatsApp,
  getWhatsAppStatus,
  sendStatus
} from "./whatsapp.js";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const app = express();

const PORT =
  Number(process.env.PORT) || 3000;

const HOST =
  process.env.HOST || "0.0.0.0";

const MAX_FILE_SIZE_MB =
  Number(process.env.MAX_FILE_SIZE_MB) || 100;

const MAX_FILE_SIZE =
  MAX_FILE_SIZE_MB * 1024 * 1024;

const uploadDir =
  path.join(__dirname, "uploads");

fs.mkdirSync(uploadDir, {
  recursive: true
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const ext =
      path.extname(file.originalname);

    const name =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}${ext}`;

    cb(null, name);
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE
  },

  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/");

    if (!allowed) {
      return cb(
        new Error(
          "File harus berupa foto atau video."
        )
      );
    }

    cb(null, true);
  }
});

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.get(
  "/api/status",
  (_req, res) => {
    res.json(
      getWhatsAppStatus()
    );
  }
);

app.post(
  "/api/upload",
  upload.single("media"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Tidak ada file."
        });
      }

      const status =
        getWhatsAppStatus();

      if (!status.connected) {
        fs.unlinkSync(
          req.file.path
        );

        return res.status(503).json({
          success: false,
          message:
            "WhatsApp belum terhubung."
        });
      }

      const caption =
        String(
          req.body.caption || ""
        ).slice(0, 500);

      const detectedMime =
        req.file.mimetype ||
        mime.lookup(req.file.path) ||
        "";

      await sendStatus({
        filePath: req.file.path,
        mimeType: detectedMime,
        caption
      });

      /*
       * File lokal dihapus setelah
       * proses upload selesai.
       */

      fs.unlink(
        req.file.path,
        () => {}
      );

      return res.json({
        success: true,
        message:
          "Status berhasil dikirim."
      });

    } catch (error) {
      console.error(error);

      if (req.file?.path) {
        fs.unlink(
          req.file.path,
          () => {}
        );
      }

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Gagal mengirim status."
      });
    }
  }
);

app.use(
  (error, _req, res, _next) => {
    console.error(error);

    if (
      error instanceof multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Ukuran file maksimal ${MAX_FILE_SIZE_MB} MB.`
        });
      }
    }

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Terjadi kesalahan."
    });
  }
);

app.listen(
  PORT,
  HOST,
  () => {
    console.log(
      `Website berjalan di http://localhost:${PORT}`
    );

    startWhatsApp();
  }
);
