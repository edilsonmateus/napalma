import express from "express";
import path from "node:path";
import cors from "cors";
import morgan from "morgan";
import { ZodError } from "zod";
import multer from "multer";
import { router } from "./routes/index.js";
import { attachUser } from "./middlewares/auth.js";
import { ensureUploadsRoot } from "./controllers/uploads.controller.js";
import { createRateLimiter } from "./middlewares/rateLimit.js";
import { securityHeaders } from "./middlewares/securityHeaders.js";
import { noStore } from "./middlewares/noStore.js";
import { requestContext } from "./middlewares/requestContext.js";
import { env } from "./config/env.js";
import { logSafeError } from "./utils/errorLogging.js";
import { checkDatabaseReadiness } from "./services/health.service.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // In production, Render/Vercel place the API behind a reverse proxy. This
  // makes req.ip usable by rate limits without changing local development.
  if (env.trustProxyHops > 0) app.set("trust proxy", env.trustProxyHops);
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

  app.use(requestContext);
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
  app.use(securityHeaders);
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan((tokens, req, res) => `${tokens.method(req, res)} ${req.path} ${tokens.status(req, res)} ${tokens["response-time"](req, res)} ms`));
  app.use("/uploads", express.static("uploads"));
  // Available only during local development; production posters are served by R2.
  if (isDev) {
    app.use(
      "/event-posters",
      express.static(path.resolve(process.cwd(), "..", "assets", "event-posters-inbox"), { index: false })
    );
  }
  app.use(attachUser);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "napalma-api" });
  });

  app.get("/health/ready", async (_req, res) => {
    const database = await checkDatabaseReadiness();
    return database.ready
      ? res.json({ status: "ready", service: "napalma-api" })
      : res.status(503).json({ status: "not_ready", service: "napalma-api" });
  });

  app.use("/api", apiGlobalLimiter);
  app.use("/api", noStore);
  app.use("/api", router);

  app.use((err, req, res, _next) => {
    logSafeError(err, req);

    if (err?.message === "Origin not allowed by CORS") {
      return res.status(403).json({
        error: "cors_origin_denied",
        message: "Origem nao autorizada.",
        requestId: req.requestId
      });
    }

    if (err?.code === "auth_context_unavailable") {
      return res.status(503).json({
        error: "auth_context_unavailable",
        message: "Nao foi possivel validar a sessao agora. Tente novamente em instantes.",
        requestId: req.requestId
      });
    }

    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "validation_error",
        message: "Payload invalido.",
        details: err.flatten(),
        requestId: req.requestId
      });
    }

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "file_too_large",
          message: "Arquivo muito grande. Limite de 5MB.",
          requestId: req.requestId
        });
      }
      return res.status(400).json({
          error: "upload_error",
          message: "Nao foi possivel processar o upload.",
          requestId: req.requestId
      });
    }

    res.status(500).json({
      error: "internal_server_error",
      message: "Nao foi possivel processar a requisicao.",
      requestId: req.requestId
    });
  });

  return app;
}
