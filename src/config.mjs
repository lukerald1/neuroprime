import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const envPath = path.join(rootDir, ".env");

if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export const config = {
  botToken: process.env.BOT_TOKEN || "",
  port: Number(process.env.PORT || 3000),
  publicMiniappUrl: normalizeUrl(
    process.env.PUBLIC_MINIAPP_URL ||
      "http://localhost:3000/miniapp/"
  ),
  dbPath: process.env.DB_PATH || "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: process.env.OPENROUTER_MODEL || ""
};

export function assertConfig() {
  if (!config.botToken) {
    throw new Error("BOT_TOKEN is required. Create .env from .env.example and set BOT_TOKEN.");
  }
}

function normalizeUrl(value) {
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
}
