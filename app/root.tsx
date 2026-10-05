import { useEffect } from "react";
import type { LinksFunction, MetaFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { FinanceProvider } from "./hooks/useFinance";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import styles from "./styles/index.css?url";

export const meta: MetaFunction = () => [
  { charset: "utf-8" },
  { name: "viewport", content: "width=device-width, initial-scale=1.0" },
  { name: "theme-color", content: "#ffffff" },
  { name: "mobile-web-app-capable", content: "yes" },
  { name: "apple-mobile-web-app-capable", content: "yes" },
  { name: "apple-mobile-web-app-status-bar-style", content: "default" },
  { name: "description", content: "Hub completo para gestão financeira, comercial e de projetos." },
  { title: "Genius Finance" },
];

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
  { rel: "apple-touch-icon", href: "/logo.png" },
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "stylesheet", href: styles },
];

export default function Root() {
  return (
    <html lang="pt-br">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <FinanceProvider>
          <Outlet />
          <ServiceWorkerSetup />
        </FinanceProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function ServiceWorkerSetup() {
  useEffect(() => {
    registerServiceWorker(navigator.serviceWorker, () => window.location.reload());
  }, []);

  return null;
}
