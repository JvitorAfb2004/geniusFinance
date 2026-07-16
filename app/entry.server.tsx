import { PassThrough } from "node:stream";
import type { AppLoadContext, EntryContext } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  try {
    const handler = isbot(request.headers.get("user-agent") || "")
      ? handleBotRequest(request, responseStatusCode, responseHeaders, routerContext)
      : handleBrowserRequest(request, responseStatusCode, responseHeaders, routerContext);

    return handler.catch((err: unknown) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : "Sem stack trace";
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Erro no Servidor (SSR)</title>
          <meta charset="utf-8">
        </head>
        <body style="font-family: system-ui, sans-serif; padding: 2rem; background: #0f172a; color: #f1f5f9; line-height: 1.6;">
          <div style="max-width: 48rem; margin: 0 auto; background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);">
            <h1 style="color: #ef4444; font-size: 1.5rem; margin-top: 0; display: flex; items-center; gap: 0.5rem;">
              <span>❌</span> Erro na inicialização da página (SSR)
            </h1>
            <p style="font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem;">Mensagem:</p>
            <p style="background: #0f172a; padding: 0.75rem; border-radius: 0.5rem; color: #f87171; border: 1px solid #dc2626; font-family: monospace; font-size: 0.9rem; margin-top: 0;">${errorMsg}</p>
            <p style="font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem; margin-top: 1.5rem;">Stack Trace:</p>
            <pre style="background: #0f172a; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; color: #94a3b8; border: 1px solid #334155; font-size: 0.8rem; font-family: monospace; max-height: 24rem;">${errorStack}</pre>
            <div style="margin-top: 2rem; font-size: 0.75rem; color: #64748b; border-t: 1px solid #334155; pt-1rem; padding-top: 1rem;">
              Genius Finance · Erro interceptado em entry.server.tsx
            </div>
          </div>
        </body>
        </html>`,
        {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : "Sem stack trace";
    return Promise.resolve(
      new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Erro Fatal no Servidor (SSR)</title>
          <meta charset="utf-8">
        </head>
        <body style="font-family: system-ui, sans-serif; padding: 2rem; background: #0f172a; color: #f1f5f9; line-height: 1.6;">
          <div style="max-width: 48rem; margin: 0 auto; background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);">
            <h1 style="color: #ef4444; font-size: 1.5rem; margin-top: 0;">
              ❌ Erro Fatal na renderização (SSR)
            </h1>
            <p style="font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem;">Mensagem:</p>
            <p style="background: #0f172a; padding: 0.75rem; border-radius: 0.5rem; color: #f87171; border: 1px solid #dc2626; font-family: monospace; font-size: 0.9rem; margin-top: 0;">${errorMsg}</p>
            <p style="font-weight: 600; color: #cbd5e1; margin-bottom: 0.5rem; margin-top: 1.5rem;">Stack Trace:</p>
            <pre style="background: #0f172a; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; color: #94a3b8; border: 1px solid #334155; font-size: 0.8rem; font-family: monospace; max-height: 24rem;">${errorStack}</pre>
            <div style="margin-top: 2rem; font-size: 0.75rem; color: #64748b; border-t: 1px solid #334155; pt-1rem; padding-top: 1rem;">
              Genius Finance · Erro Fatal interceptado em entry.server.tsx
            </div>
          </div>
        </body>
        </html>`,
        {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      )
    );
  }
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        },
      },
    );
    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        },
      },
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
