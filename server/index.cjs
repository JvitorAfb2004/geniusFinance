const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 3001;
const NVIDIA_HOST = "integrate.api.nvidia.com";
const MODEL = "google/gemma-3n-e4b-it";

const API_KEY = process.env.NVIDIA_API_KEY;
if (!API_KEY) {
  console.error("ERRO: NVIDIA_API_KEY nao definida no .env");
  process.exit(1);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function buildPayload(body) {
  return {
    model: MODEL,
    messages: body.messages,
    max_tokens: body.max_tokens || 512,
    temperature: body.temperature ?? 0.2,
    top_p: body.top_p ?? 0.7,
    frequency_penalty: body.frequency_penalty ?? 0,
    presence_penalty: body.presence_penalty ?? 0,
    stream: body.stream || false,
  };
}

function proxyNonStream(req, res, body) {
  return new Promise((resolve, reject) => {
    const payload = buildPayload(body);
    const data = JSON.stringify(payload);

    const options = {
      hostname: NVIDIA_HOST,
      port: 443,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
      timeout: 120000,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let responseData = "";
      proxyRes.on("data", (chunk) => { responseData += chunk; });
      proxyRes.on("end", () => {
        if (proxyRes.statusCode >= 400) {
          console.error("[non-stream] NVIDIA erro", proxyRes.statusCode, ":", responseData.slice(0, 500));
        }
        res.writeHead(proxyRes.statusCode, {
          ...corsHeaders(),
          "Content-Type": "application/json",
        });
        res.end(responseData);
        resolve();
      });
    });

    proxyReq.on("error", (err) => {
      console.error("[non-stream] Erro proxy NVIDIA:", err.message);
      res.writeHead(502, corsHeaders());
      res.end(JSON.stringify({ error: "Erro ao conectar com NVIDIA API: " + err.message }));
      reject(err);
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      res.writeHead(504, corsHeaders());
      res.end(JSON.stringify({ error: "Timeout ao conectar com NVIDIA API" }));
      reject(new Error("timeout"));
    });

    proxyReq.write(data);
    proxyReq.end();
  });
}

function proxyStream(req, res, body) {
  return new Promise((resolve, reject) => {
    const payload = buildPayload(body);
    const data = JSON.stringify(payload);

    const options = {
      hostname: NVIDIA_HOST,
      port: 443,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "text/event-stream",
        "Content-Length": Buffer.byteLength(data),
      },
      timeout: 120000,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...corsHeaders(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });

      proxyRes.on("data", (chunk) => {
        res.write(chunk);
      });

      proxyRes.on("end", () => {
        res.end();
        resolve();
      });

      proxyRes.on("error", (err) => {
        console.error("Stream error:", err.message);
        res.end();
        reject(err);
      });
    });

    proxyReq.on("error", (err) => {
      console.error("Erro proxy NVIDIA (stream):", err.message);
      res.writeHead(502, corsHeaders());
      res.end(JSON.stringify({ error: "Erro ao conectar com NVIDIA API: " + err.message }));
      reject(err);
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      res.end();
      reject(new Error("timeout"));
    });

    proxyReq.write(data);
    proxyReq.end();
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", model: MODEL }));
    return;
  }

  if (req.method === "POST" && req.url === "/api/ai/chat") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.stream) {
          await proxyStream(req, res, parsed);
        } else {
          await proxyNonStream(req, res, parsed);
        }
      } catch (e) {
        res.writeHead(400, corsHeaders());
        res.end(JSON.stringify({ error: "JSON invalido" }));
      }
    });
    return;
  }

  res.writeHead(404, corsHeaders());
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`AI Proxy rodando em http://localhost:${PORT}`);
  console.log(`Modelo: ${MODEL}`);
  console.log(`Streaming: habilitado`);
});
