import type { LinksFunction, MetaFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { FinanceProvider } from "./hooks/useFinance";
import styles from "./styles/index.css?url";

export const meta: MetaFunction = () => [
  { charset: "utf-8" },
  { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" },
  { name: "theme-color", content: "#1e293b" },
  { name: "description", content: "Hub completo para gestão financeira, comercial e de projetos." },
  { title: "Genius Finance" },
];

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
  { rel: "apple-touch-icon", href: "/logo.png" },
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
        </FinanceProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
