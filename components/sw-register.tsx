"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      return;
    }

    // En desarrollo NO usamos el service worker: cachea los chunks de
    // /_next/static con nombres estables y, tras recompilar, sirve versiones
    // viejas que rompen el runtime de webpack ("Cannot read properties of
    // undefined (reading 'call')"). Desregistramos cualquiera ya instalado y
    // limpiamos sus caches para auto-curar el navegador.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }, []);

  return null;
}
