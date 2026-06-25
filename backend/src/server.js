import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureAdminBootstrap } from "./lib/adminBootstrap.js";

const app = createApp();

try {
  await ensureAdminBootstrap();
} catch (error) {
  console.error("Erro ao preparar admin definitivo:", error);
}

app.listen(env.port, () => {
  console.log(`NaPalma API online na porta ${env.port}`);
});
