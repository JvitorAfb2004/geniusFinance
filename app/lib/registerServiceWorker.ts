export function registerServiceWorker(
  serviceWorker: ServiceWorkerContainer | undefined,
  reload: () => void,
) {
  if (!serviceWorker) return;

  let isControlled = Boolean(serviceWorker.controller);
  let hasReloaded = false;

  serviceWorker.addEventListener("controllerchange", () => {
    if (!isControlled) {
      isControlled = true;
      return;
    }

    if (hasReloaded) return;
    hasReloaded = true;
    reload();
  });

  void serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
}
