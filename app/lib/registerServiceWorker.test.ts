import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./registerServiceWorker";

describe("registerServiceWorker", () => {
  it("does nothing when the browser has no service worker support", () => {
    const reload = vi.fn();

    registerServiceWorker(undefined, reload);

    expect(reload).not.toHaveBeenCalled();
  });

  it("does not reload for first control, then reloads once for a new version", () => {
    let controller: ServiceWorker | null = null;
    let onControllerChange: EventListener | undefined;
    const register = vi.fn().mockResolvedValue({});
    const container = {
      get controller() {
        return controller;
      },
      register,
      addEventListener: (_type: string, listener: EventListener) => {
        onControllerChange = listener;
      },
    } as unknown as ServiceWorkerContainer;
    const reload = vi.fn();

    registerServiceWorker(container, reload);
    expect(register).toHaveBeenCalledWith("/sw.js", { updateViaCache: "none" });

    controller = {} as ServiceWorker;
    onControllerChange?.(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();

    onControllerChange?.(new Event("controllerchange"));
    onControllerChange?.(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads once when an already-controlled page gets a new controller", () => {
    const reload = vi.fn();
    let onControllerChange: EventListener | undefined;
    const container = {
      controller: {} as ServiceWorker,
      register: vi.fn().mockResolvedValue({}),
      addEventListener: (_type: string, listener: EventListener) => {
        onControllerChange = listener;
      },
    } as unknown as ServiceWorkerContainer;

    registerServiceWorker(container, reload);
    onControllerChange?.(new Event("controllerchange"));
    onControllerChange?.(new Event("controllerchange"));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
