import express from "express";
import cors from "cors";
import morgan from "morgan";
import { ZodError } from "zod";
import multer from "multer";
import { router } from "./routes/index.js";
import { attachUser } from "./middlewares/auth.js";
import { ensureUploadsRoot } from "./controllers/uploads.controller.js";
import { createRateLimiter } from "./middlewares/rateLimit.js";

export function createApp() {
  const app = express();
  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isDev = process.env.NODE_ENV !== "production";
  ensureUploadsRoot().catch((error) => {
    console.error("Erro ao preparar pasta de uploads:", error);
  });

  const apiGlobalLimiter = createRateLimiter({
    keyPrefix: "api-global",
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_GLOBAL_MAX || 240),
    message: "Muitas requisicoes no momento. Tente novamente em instantes."
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (configuredOrigins.length === 0 && isDev) return callback(null, true);
        if (configuredOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed by CORS"), false);
      }
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));
  app.use("/uploads", express.static("uploads"));
  app.use(attachUser);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "napalma-api" });
  });

  app.use("/api", apiGlobalLimiter);
  app.use("/api", router);

  app.use((err, _req, res, _next) => {
    console.error(err);

    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "validation_error",
        message: "Payload invalido.",
        details: err.flatten()
      });
    }

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "file_too_large",
          message: "Arquivo muito grande. Limite de 5MB."
        });
      }
      return res.status(400).json({
        error: "upload_error",
        message: "Nao foi possivel processar o upload."
      });
    }

    res.status(500).json({
      error: "internal_server_error",
      message: "Nao foi possivel processar a requisicao."
    });
  });

  return app;
}
