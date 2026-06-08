import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildBootstrap,
  createEvent,
  createRequest,
  ensureUser,
  getCatalog,
  getProfile,
  listEvents,
  listModelUsage,
  listRequests,
  markOpen,
  saveProfile,
  setSelectedProvider
} from "./storage.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const miniappPath = path.join(rootDir, "docs", "miniapp", "index.html");

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function json(res, statusCode, data) {
  send(res, statusCode, JSON.stringify(data), "application/json; charset=utf-8");
}

function serveMiniapp(res) {
  const body = fs.readFileSync(miniappPath, "utf8");
  send(res, 200, body, "text/html; charset=utf-8");
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function resolveTelegramId(url, body = {}) {
  const candidate = body.telegramId ?? body.userId ?? url.searchParams.get("telegramId") ?? url.searchParams.get("userId") ?? 137;
  const value = Number(candidate);
  return Number.isFinite(value) && value > 0 ? value : 137;
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/miniapp" || url.pathname === "/miniapp/") {
    return serveMiniapp(res);
  }

  if (url.pathname === "/api/bootstrap" && req.method === "GET") {
    return json(res, 200, buildBootstrap(resolveTelegramId(url)));
  }

  if (url.pathname === "/api/catalog" && req.method === "GET") {
    return json(res, 200, getCatalog());
  }

  if (url.pathname === "/api/models" && req.method === "GET") {
    const telegramId = resolveTelegramId(url);
    ensureUser(telegramId);
    return json(res, 200, {
      providers: getCatalog().providers,
      usage: listModelUsage(telegramId)
    });
  }

  if (url.pathname === "/api/prices" && req.method === "GET") {
    return json(res, 200, { items: getCatalog().pricing });
  }

  if (url.pathname === "/api/cases" && req.method === "GET") {
    return json(res, 200, { items: getCatalog().cases });
  }

  if (url.pathname === "/api/profile") {
    const telegramId = resolveTelegramId(url);
    ensureUser(telegramId);

    if (req.method === "GET") {
      return json(res, 200, { profile: getProfile(telegramId) });
    }

    if (req.method === "PATCH" || req.method === "POST") {
      const body = await parseJsonBody(req);
      const profile = saveProfile(telegramId, body);
      createEvent({
        telegramId,
        type: "profile_saved",
        value: body.preferredTab || body.selectedProviderId || "profile",
        meta: body
      });
      if (body.selectedProviderId) {
        setSelectedProvider(telegramId, body.selectedProviderId);
      }
      return json(res, 200, { profile });
    }
  }

  if (url.pathname === "/api/requests") {
    const telegramId = resolveTelegramId(url);
    ensureUser(telegramId);

    if (req.method === "GET") {
      const limit = Math.max(1, Number(url.searchParams.get("limit") || 20));
      return json(res, 200, { items: listRequests(telegramId, limit) });
    }

    if (req.method === "POST") {
      const body = await parseJsonBody(req);
      const request = createRequest({
        telegramId,
        source: body.source || "miniapp",
        title: body.title,
        text: body.text,
        category: body.category || "general",
        modelId: body.modelId || body.selectedProviderId || "",
        status: body.status || "new"
      });
      return json(res, 201, { request });
    }
  }

  if (url.pathname === "/api/events") {
    const telegramId = resolveTelegramId(url);
    ensureUser(telegramId);

    if (req.method === "GET") {
      const limit = Math.max(1, Number(url.searchParams.get("limit") || 20));
      return json(res, 200, { items: listEvents(telegramId, limit) });
    }

    if (req.method === "POST") {
      const body = await parseJsonBody(req);
      createEvent({
        telegramId,
        type: body.type || "custom",
        value: body.value || "",
        meta: body.meta || {}
      });
      return json(res, 201, { ok: true });
    }
  }

  if (url.pathname === "/api/open" && req.method === "POST") {
    const body = await parseJsonBody(req);
    const telegramId = resolveTelegramId(url, body);
    ensureUser(telegramId);
    markOpen(telegramId, body.tab || "home");
    return json(res, 200, { ok: true });
  }

  if (url.pathname === "/api/stats" && req.method === "GET") {
    const telegramId = resolveTelegramId(url);
    return json(res, 200, buildBootstrap(telegramId).stats);
  }

  send(res, 404, "Not found");
}

export function startWebapp(port) {
  const server = http.createServer((req, res) => {
    void handleRequest(req, res).catch((error) => {
      console.error(`Web server error: ${error.message}`);
      if (!res.headersSent) {
        send(res, 500, "Internal server error");
      } else {
        res.destroy();
      }
    });
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.warn(`Miniapp server already uses port ${port}; continuing with existing instance.`);
      return;
    }
    throw error;
  });

  server.listen(port, () => {
    console.log(`Web server: http://localhost:${port}/ and /miniapp`);
  });

  return server;
}
