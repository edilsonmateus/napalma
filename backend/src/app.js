import express from "express";
import cors from "cors";
import morgan from "morgan";
import { ZodError } from "zod";
import { router } from "./routes/index.js";
import { attachUser } from "./middlewares/auth.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(attachUser);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "napalma-api" });
  });

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

    res.status(500).json({
      error: "internal_server_error",
      message: "Nao foi possivel processar a requisicao."
    });
  });

  return app;
}
