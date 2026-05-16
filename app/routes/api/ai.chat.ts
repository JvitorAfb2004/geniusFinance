import type { ActionFunctionArgs } from "react-router";
import https from "node:https";

const NVIDIA_HOST = "integrate.api.nvidia.com";
const MODEL = "google/gemma-3n-e4b-it";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

interface ChatBody {
  messages: unknown[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

function buildPayload(body: ChatBody) {
  if (!NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY nao configurada");
  return JSON.stringify({
    model: MODEL,
    messages: body.messages,
    max_tokens: body.max_tokens || 512,
    temperature: body.temperature ?? 0.2,
    top_p: body.top_p ?? 0.7,
    frequency_penalty: body.frequency_penalty ?? 0,
    presence_penalty: body.presence_penalty ?? 0,
    stream: body.stream || false,
  });
}

function proxyNonStream(body: ChatBody): Promise<Response> {
  return new Promise((resolve) => {
    const data = buildPayload(body);
    const proxyReq = https.request({
      hostname: NVIDIA_HOST,
      port: 443,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        Accept: "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
      timeout: 120000,
    }, (proxyRes) => {
      let responseData = "";
      proxyRes.on("data", (chunk) => { responseData += chunk; });
      proxyRes.on("end", () => {
        if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
          console.error("[non-stream] NVIDIA erro", proxyRes.statusCode, ":", responseData.slice(0, 500));
        }
        resolve(new Response(responseData, {
          status: proxyRes.statusCode || 200,
          headers: { "Content-Type": "application/json" },
        }));
      });
    });
    proxyReq.on("error", (err) => {
      resolve(new Response(JSON.stringify({ error: "Erro NVIDIA: " + err.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }));
    });
    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      resolve(new Response(JSON.stringify({ error: "Timeout NVIDIA" }), {
        status: 504,
        headers: { "Content-Type": "application/json" },
      }));
    });
    proxyReq.write(data);
    proxyReq.end();
  });
}

function proxyStream(body: ChatBody): Promise<Response> {
  return new Promise((resolve) => {
    const data = buildPayload(body);
    const proxyReq = https.request({
      hostname: NVIDIA_HOST,
      port: 443,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        Accept: "text/event-stream",
        "Content-Length": Buffer.byteLength(data),
      },
      timeout: 120000,
    }, (proxyRes) => {
      // Create a ReadableStream from the proxy response
      const stream = new ReadableStream({
        start(controller) {
          proxyRes.on("data", (chunk) => controller.enqueue(new TextEncoder().encode(chunk.toString())));
          proxyRes.on("end", () => controller.close());
          proxyRes.on("error", (err) => controller.error(err));
        },
      });
      resolve(new Response(stream, {
        status: proxyRes.statusCode || 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }));
    });
    proxyReq.on("error", (err) => {
      resolve(new Response(JSON.stringify({ error: "Erro NVIDIA: " + err.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }));
    });
    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      resolve(new Response(JSON.stringify({ error: "Timeout NVIDIA" }), { status: 504 }));
    });
    proxyReq.write(data);
    proxyReq.end();
  });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body: ChatBody = await request.json();
    if (body.stream) {
      return proxyStream(body);
    }
    return proxyNonStream(body);
  } catch {
    return new Response(JSON.stringify({ error: "JSON invalido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
