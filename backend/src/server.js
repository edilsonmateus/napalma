import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureAdminBootstrap } from "./lib/adminBootstrap.js";
import { startToNaPistaScheduler } from "./services/toNaPista.service.js";
import { startAdsHealthAlertScheduler } from "./services/adsHealthAlerts.service.js";

const app = createApp();

try {
  const adminBootstrap = await ensureAdminBootstrap();
  if (adminBootstrap?.created) {
    console.log(`Admin definitivo criado: ${adminBootstrap.email}`);
  } else if (adminBootstrap?.updated) {
    console.log(`Admin definitivo atualizado: ${adminBootstrap.email}`);
  } else if (adminBootstrap?.skipped) {
    console.log(`Admin definitivo não aplicado: ${adminBootstrap.reason}`);
  }
} catch (error) {
  console.error("Erro ao preparar admin definitivo:", error);
}

app.listen(env.port, () => {
  console.log(`NaPalma API online na porta ${env.port}`);
  startToNaPistaScheduler();
  startAdsHealthAlertScheduler();
});
