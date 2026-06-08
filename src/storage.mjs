import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  budgets,
  caseStudies,
  channels,
  createAnalyticsStats,
  dataTypes,
  industries,
  promptPacks,
  providerRegistry,
  regions,
  skills,
  solutionCatalog,
  tasks,
  titleById
} from "./data.mjs";
import { config } from "./config.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const dbPath = normalizeDbPath(config.dbPath || path.join(rootDir, "data", "miniapp.sqlite"));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    language_code TEXT,
    company TEXT DEFAULT '',
    role TEXT DEFAULT '',
    about TEXT DEFAULT '',
    selected_provider_id TEXT DEFAULT '',
    preferred_tab TEXT DEFAULT 'catalog',
    last_open_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    category TEXT NOT NULL,
    model_id TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    value TEXT DEFAULT '',
    meta TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_requests_user_created ON requests(telegram_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_events_user_created ON events(telegram_id, created_at DESC);
`);

const statements = {
  upsertUser: db.prepare(`
    INSERT INTO users (
      telegram_id, username, first_name, last_name, photo_url, language_code,
      company, role, about, selected_provider_id, preferred_tab, last_open_at,
      created_at, updated_at
    ) VALUES (
      @telegram_id, @username, @first_name, @last_name, @photo_url, @language_code,
      @company, @role, @about, @selected_provider_id, @preferred_tab, @last_open_at,
      @created_at, @updated_at
    )
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = COALESCE(NULLIF(excluded.username, ''), users.username),
      first_name = COALESCE(NULLIF(excluded.first_name, ''), users.first_name),
      last_name = COALESCE(NULLIF(excluded.last_name, ''), users.last_name),
      photo_url = COALESCE(NULLIF(excluded.photo_url, ''), users.photo_url),
      language_code = COALESCE(NULLIF(excluded.language_code, ''), users.language_code),
      company = COALESCE(NULLIF(excluded.company, ''), users.company),
      role = COALESCE(NULLIF(excluded.role, ''), users.role),
      about = COALESCE(NULLIF(excluded.about, ''), users.about),
      selected_provider_id = COALESCE(NULLIF(excluded.selected_provider_id, ''), users.selected_provider_id),
      preferred_tab = COALESCE(NULLIF(excluded.preferred_tab, ''), users.preferred_tab),
      last_open_at = COALESCE(excluded.last_open_at, users.last_open_at),
      updated_at = excluded.updated_at
  `),
  getUser: db.prepare(`SELECT * FROM users WHERE telegram_id = ?`),
  setProfile: db.prepare(`
    UPDATE users
    SET company = COALESCE(?, company),
        role = COALESCE(?, role),
        about = COALESCE(?, about),
        selected_provider_id = COALESCE(?, selected_provider_id),
        preferred_tab = COALESCE(?, preferred_tab),
        updated_at = ?
    WHERE telegram_id = ?
  `),
  touchOpen: db.prepare(`
    UPDATE users
    SET last_open_at = ?, updated_at = ?
    WHERE telegram_id = ?
  `),
  createRequest: db.prepare(`
    INSERT INTO requests (
      telegram_id, source, title, text, category, model_id, status, created_at, updated_at
    ) VALUES (
      @telegram_id, @source, @title, @text, @category, @model_id, @status, @created_at, @updated_at
    )
  `),
  listRequests: db.prepare(`
    SELECT * FROM requests
    WHERE telegram_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT ?
  `),
  countRequests: db.prepare(`SELECT COUNT(*) AS count FROM requests WHERE telegram_id = ?`),
  countEventsByType: db.prepare(`SELECT COUNT(*) AS count FROM events WHERE telegram_id = ? AND type = ?`),
  listRecentRequests: db.prepare(`
    SELECT id, telegram_id, source, title, text, category, model_id, status, created_at, updated_at
    FROM requests
    WHERE telegram_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT ?
  `),
  createEvent: db.prepare(`
    INSERT INTO events (telegram_id, type, value, meta, created_at)
    VALUES (@telegram_id, @type, @value, @meta, @created_at)
  `),
  listEvents: db.prepare(`
    SELECT * FROM events
    WHERE telegram_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT ?
  `),
  listModelUsage: db.prepare(`
    SELECT COALESCE(NULLIF(model_id, ''), 'none') AS model_id, COUNT(*) AS count
    FROM requests
    WHERE telegram_id = ?
    GROUP BY COALESCE(NULLIF(model_id, ''), 'none')
  `)
};

function normalizeDbPath(value) {
  return value || path.join(rootDir, "data", "miniapp.sqlite");
}

function nowIso() {
  return new Date().toISOString();
}

function cleanTelegramId(value) {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Telegram id is required");
  }
  return id;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function resolveProvider(modelId) {
  if (!modelId) return null;
  const provider = providerRegistry.find(
    (item) => item.id === modelId || item.model === modelId || item.title === modelId
  );

  return provider
    ? {
        id: provider.id,
        title: provider.title,
        model: provider.model,
        type: provider.type,
        priority: provider.priority
      }
    : null;
}

function hydrateUser(row) {
  if (!row) return null;
  const selectedProvider = resolveProvider(row.selected_provider_id);

  return {
    telegramId: row.telegram_id,
    username: row.username || "",
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    photoUrl: row.photo_url || "",
    languageCode: row.language_code || "",
    company: row.company || "",
    role: row.role || "",
    about: row.about || "",
    selectedProviderId: row.selected_provider_id || "",
    selectedProvider,
    preferredTab: row.preferred_tab || "catalog",
    lastOpenAt: row.last_open_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    displayName: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.username || `User ${row.telegram_id}`
  };
}

function getUser(telegramId) {
  const row = statements.getUser.get(cleanTelegramId(telegramId));
  return row ? hydrateUser(row) : null;
}

function ensureUser(telegramUserOrId = {}) {
  const user = typeof telegramUserOrId === "number" ? { id: telegramUserOrId } : telegramUserOrId;
  const telegramId = cleanTelegramId(user.id || user.telegram_id);
  const timestamp = nowIso();

  statements.upsertUser.run({
    telegram_id: telegramId,
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    photo_url: user.photo_url || "",
    language_code: user.language_code || "",
    company: user.company || "",
    role: user.role || "",
    about: user.about || "",
    selected_provider_id: user.selected_provider_id || "",
    preferred_tab: user.preferred_tab || "catalog",
    last_open_at: user.last_open_at || null,
    created_at: timestamp,
    updated_at: timestamp
  });

  return getUser(telegramId);
}

function saveProfile(telegramId, patch = {}) {
  const id = cleanTelegramId(telegramId);
  const timestamp = nowIso();
  statements.setProfile.run(
    patch.company ?? null,
    patch.role ?? null,
    patch.about ?? null,
    patch.selectedProviderId ?? patch.selected_provider_id ?? null,
    patch.preferredTab ?? patch.preferred_tab ?? null,
    timestamp,
    id
  );
  return getUser(id);
}

function markOpen(telegramId, tab = "home") {
  const id = cleanTelegramId(telegramId);
  const timestamp = nowIso();
  statements.touchOpen.run(timestamp, timestamp, id);
  createEvent({ telegramId: id, type: "miniapp_open", value: tab, meta: {} });
}

function createRequest({
  telegramId,
  source = "miniapp",
  title,
  text,
  category = "general",
  modelId = "",
  status = "new"
}) {
  const id = cleanTelegramId(telegramId);
  const user = getUser(id);
  const timestamp = nowIso();
  const requestTitle = String(title || text || "Новая заявка").trim().slice(0, 80);
  const requestText = String(text || title || "").trim();
  const resolvedModelId = modelId || user?.selectedProviderId || "";

  statements.createRequest.run({
    telegram_id: id,
    source,
    title: requestTitle,
    text: requestText,
    category,
    model_id: resolvedModelId,
    status,
    created_at: timestamp,
    updated_at: timestamp
  });

  createEvent({
    telegramId: id,
    type: "request_created",
    value: requestTitle,
    meta: { source, category, modelId: resolvedModelId }
  });

  return listRequests(id, 1)[0] || null;
}

function hydrateRequest(row) {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    source: row.source,
    title: row.title,
    text: row.text,
    category: row.category,
    modelId: row.model_id || "",
    model: resolveProvider(row.model_id),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function listRequests(telegramId, limit = 20) {
  return statements.listRecentRequests.all(cleanTelegramId(telegramId), Math.max(1, Number(limit) || 20)).map(hydrateRequest);
}

function createEvent({ telegramId, type, value = "", meta = {} }) {
  const id = cleanTelegramId(telegramId);
  statements.createEvent.run({
    telegram_id: id,
    type,
    value: String(value || ""),
    meta: JSON.stringify(meta || {}),
    created_at: nowIso()
  });
}

function listEvents(telegramId, limit = 20) {
  return statements.listEvents.all(cleanTelegramId(telegramId), Math.max(1, Number(limit) || 20)).map((row) => ({
    id: row.id,
    telegramId: row.telegram_id,
    type: row.type,
    value: row.value || "",
    meta: safeJsonParse(row.meta),
    createdAt: row.created_at
  }));
}

function listModelUsage(telegramId) {
  const rows = statements.listModelUsage.all(cleanTelegramId(telegramId));
  const counts = new Map(rows.map((row) => [row.model_id, row.count]));

  return providerRegistry.map((provider, index) => {
    const usage = Number(counts.get(provider.id) || 0);
    return {
      id: provider.id,
      title: provider.title,
      model: provider.model,
      type: provider.type,
      priority: provider.priority,
      usage,
      tokens: 28000 + index * 5200 + usage * 2200,
      costRub: 380 + index * 90 + usage * 45
    };
  });
}

function listActivity(telegramId, limit = 12) {
  const id = cleanTelegramId(telegramId);
  const requestItems = listRequests(id, limit).map((item) => ({
    kind: "request",
    title: item.title,
    detail: `${item.source} / ${item.category}`,
    createdAt: item.createdAt
  }));
  const eventItems = listEvents(id, limit).map((item) => ({
    kind: "event",
    title: eventLabel(item.type),
    detail: item.value || item.type,
    createdAt: item.createdAt
  }));

  return [...requestItems, ...eventItems]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

function eventLabel(type) {
  const labels = {
    miniapp_open: "Открытие miniapp",
    bot_start: "Открытие бота",
    tab_view: "Переход по вкладке",
    profile_saved: "Профиль обновлен",
    model_selected: "Выбор модели",
    request_created: "Создана заявка"
  };
  return labels[type] || type;
}

function buildStats(telegramId) {
  const id = cleanTelegramId(telegramId);
  const base = createAnalyticsStats(id);
  const requestsCount = Number(statements.countRequests.get(id)?.count || 0);
  const opensCount = Number(statements.countEventsByType.get(id, "miniapp_open")?.count || 0);
  const requestEnergy = requestsCount * 3600;

  return {
    balanceRub: base.balanceRub + requestsCount * 260 + opensCount * 40,
    topUpsRub: base.topUpsRub + requestsCount * 1400,
    tokensUsed: base.tokensUsed + requestsCount * 2100,
    estimatedSavingsRub: base.estimatedSavingsRub + requestEnergy,
    roi: Number((2.1 + requestsCount * 0.14 + opensCount * 0.05).toFixed(1)),
    testsRun: base.testsRun + requestsCount + opensCount,
    requestsCount,
    opensCount,
    modelsUsed: listModelUsage(id),
    activity: listActivity(id)
  };
}

function getCatalogPayload() {
  return {
    industries,
    tasks,
    channels,
    dataTypes,
    budgets,
    skills,
    regions,
    promptPacks,
    providers: providerRegistry,
    solutions: solutionCatalog,
    cases: caseStudies,
    pricing: solutionCatalog.map((item) => ({
      id: item.id,
      title: item.title,
      monthlyRub: item.monthlyRub,
      effort: item.effort,
      providers: item.providers,
      bestFor: item.bestFor,
      summary: item.whyFirst,
      tradeoffs: item.tradeoffs
    }))
  };
}

function getProfile(telegramId) {
  const user = getUser(telegramId);
  if (!user) return null;
  return {
    ...user,
    selectedProviderLabel: user.selectedProvider?.title || "Не выбрана"
  };
}

function buildBootstrap(telegramUserOrId) {
  const user = ensureUser(telegramUserOrId);
  const telegramId = user.telegramId;
  markOpen(telegramId, "home");

  return {
    user: getProfile(telegramId),
    profile: getProfile(telegramId),
    requests: listRequests(telegramId, 20),
    events: listEvents(telegramId, 20),
    stats: buildStats(telegramId),
    catalog: getCatalogPayload()
  };
}

function setSelectedProvider(telegramId, providerId) {
  const user = saveProfile(telegramId, { selectedProviderId: providerId });
  createEvent({ telegramId, type: "model_selected", value: providerId, meta: {} });
  return user;
}

function toResponseCatalog() {
  return getCatalogPayload();
}

export {
  buildBootstrap,
  buildStats,
  createEvent,
  createRequest,
  dbPath,
  ensureUser,
  getCatalogPayload as getCatalog,
  getProfile,
  listActivity,
  listEvents,
  listModelUsage,
  listRequests,
  markOpen,
  resolveProvider,
  saveProfile,
  setSelectedProvider,
  toResponseCatalog
};
