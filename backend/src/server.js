import { createApp } from "./app.js";
import { assertProductionSecurityConfig, env } from "./config/env.js";
import { ensureAdminBootstrap } from "./lib/adminBootstrap.js";
import { startToNaPistaScheduler } from "./services/toNaPista.service.js";
import { startAdsHealthAlertScheduler } from "./services/adsHealthAlerts.service.js";
import { refreshDemoEventDates, startDemoEventRefreshScheduler } from "./services/demoEventsRefresh.service.js";
import { startRadarEventReminderScheduler } from "./services/eventReminder.service.js";

assertProductionSecurityConfig();
const app = createApp();

try {
  const adminBootstrap = await ensureAdminBootstrap();
  if (adminBootstrap?.created) {
    console.log(`Admin definitivo criado: ${adminBootstrap.email}`);
  } else if (adminBootstrap?.passwordReset) {
    console.warn(`Senha do admin redefinida explicitamente por bootstrap: ${adminBootstrap.email}`);
  } else if (adminBootstrap?.skipped) {
    console.log(`Admin definitivo não aplicado: ${adminBootstrap.reason}`);
  }
} catch (error) {
  console.error("Erro ao preparar admin definitivo:", error);
}

try {
  const demoRefresh = await refreshDemoEventDates({ force: true });
  console.log(`Agenda demo pronta: ${demoRefresh.updated} eventos; ${demoRefresh.recognized} reconhecidos.`);
} catch (error) {
  // A agenda de demonstração nunca deve impedir a API real de iniciar.
  console.error("Erro ao preparar agenda demo:", error);
}

app.listen(env.port, () => {
  console.log(`NaPalma API online na porta ${env.port}`);
  startToNaPistaScheduler();
  startAdsHealthAlertScheduler();
  startDemoEventRefreshScheduler();
  startRadarEventReminderScheduler();
});
