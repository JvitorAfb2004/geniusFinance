import type { ActionFunctionArgs } from "react-router";
import https from "node:https";

interface NIMModel {
  name: string;
  model: string;
  description: string;
}

const NIM_MODELS: NIMModel[] = [
  { name: "gemma-3n-e4b", model: "google/gemma-3n-e4b-it", description: "Primary: Google Gemma 3N 4B (fast, efficient)" },
  { name: "nemotron-nano-8b", model: "nvidia/llama-3.1-nemotron-nano-8b-v1", description: "Fallback: NVIDIA Nemotron Nano 8B (very fast)" },
  { name: "llama-3.1-8b", model: "meta/llama-3.1-8b-instruct", description: "Fallback: Meta Llama 3.1 8B (fast, reliable)" },
  { name: "gemma-2-9b", model: "google/gemma-2-9b-it", description: "Fallback: Google Gemma 2 9B (fast)" },
  { name: "mistral-7b", model: "mistralai/mistral-7b-instruct-v0.3", description: "Fallback: Mistral 7B (fast)" },
  { name: "nemotron-3-ultra", model: "nvidia/nemotron-3-ultra-550b-a55b", description: "Fallback: Nemotron 3 Ultra 550B (smartest, slower)" },
  { name: "llama-3.3-nemotron-super", model: "nvidia/llama-3.3-nemotron-super-49b-v1.5", description: "Fallback: Nemotron Super 49B (balanced)" },
];

const NVIDIA_HOST = "integrate.api.nvidia.com";
const NVIDIA_PATH = "/v1/chat/completions";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

interface ChatBody {
  messages: unknown[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  model?: string;
}

function buildPayload(body: ChatBody, model: string) {
  if (!NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY nao configurada");
  return JSON.stringify({
    model,
    messages: body.messages,
    max_tokens: body.max_tokens || 512,
    temperature: body.temperature ?? 0.2,
    top_p: body.top_p ?? 0.7,
    frequency_penalty: body.frequency_penalty ?? 0,
    presence_penalty: body.presence_penalty ?? 0,
    stream: body.stream || false,
  });
}

function makeRequest(model: string, data: string, stream: boolean): Promise<Response> {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: NVIDIA_HOST,
      port: 443,
      path: NVIDIA_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: stream ? "text/event-stream" : "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        "Content-Length": Buffer.byteLength(data),
      },
      timeout: 60000,
    }, (res) => {
      let responseData = "";
      res.on("data", (chunk) => { responseData += chunk; });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          console.error(`[NIM:${model}] erro ${res.statusCode}:`, responseData.slice(0, 500));
        }
        if (stream) {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(responseData));
              controller.close();
            },
          });
          resolve(new Response(stream, {
            status: res.statusCode || 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          }));
        } else {
          resolve(new Response(responseData, {
            status: res.statusCode || 200,
            headers: { "Content-Type": "application/json" },
          }));
        }
      });
    });

    req.on("error", (err) => {
      resolve(new Response(JSON.stringify({ error: `NIM:${model}: ${err.message}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }));
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(new Response(JSON.stringify({ error: `NIM:${model}: timeout` }), { status: 504 }));
    });
    req.write(data);
    req.end();
  });
}

async function tryModels(body: ChatBody): Promise<Response> {
  if (!NVIDIA_API_KEY) {
    return new Response(JSON.stringify({ error: "NVIDIA_API_KEY nao configurada" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const requestedModel = body.model;
  const models = requestedModel
    ? [NIM_MODELS.find(m => m.model === requestedModel), ...NIM_MODELS.filter(m => m.model !== requestedModel)].filter(Boolean) as NIMModel[]
    : NIM_MODELS;

  let lastError = "";
  for (const m of models) {
    try {
      const data = buildPayload(body, m.model);
      const res = await makeRequest(m.model, data, body.stream || false);
      if (res.ok || res.status === 400) {
        console.log(`[NIM] Usando modelo: ${m.name} (${m.model})`);
        return res;
      }
      lastError = `${m.name}: HTTP ${res.status}`;
    } catch (e: any) {
      lastError = `${m.name}: ${e.message}`;
    }
  }

  return new Response(JSON.stringify({ error: `Todos modelos NIM falharam: ${lastError}` }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body: ChatBody = await request.json();
    return tryModels(body);
  } catch {
    return new Response(JSON.stringify({ error: "JSON invalido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}