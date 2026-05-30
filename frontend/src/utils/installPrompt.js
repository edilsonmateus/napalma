let deferredInstallPrompt = null;
let isSetupDone = false;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => {
    try {
      listener(Boolean(deferredInstallPrompt));
    } catch (_error) {
      // no-op
    }
  });
}

export function setupInstallPromptCapture() {
  if (isSetupDone || typeof window === "undefined") return;
  isSetupDone = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    emit();
  });
}

export function subscribeInstallPrompt(listener) {
  listeners.add(listener);
  listener(Boolean(deferredInstallPrompt));
  return () => listeners.delete(listener);
}

export async function promptInstallApp() {
  if (!deferredInstallPrompt) return null;
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  emit();
  promptEvent.prompt();
  try {
    return await promptEvent.userChoice;
  } catch (_error) {
    return null;
  }
}

