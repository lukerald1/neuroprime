import { config } from "./config.mjs";
import {
  createEvent,
  createRequest,
  ensureUser,
  getProfile,
  listRequests,
  saveProfile
} from "./storage.mjs";

const apiBase = `https://api.telegram.org/bot${config.botToken}`;
const sessions = new Map();

function getSession(chatId) {
  const key = String(chatId);
  if (!sessions.has(key)) {
    sessions.set(key, {
      awaitingRequest: false
    });
  }
  return sessions.get(key);
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

async function api(method, payload, timeoutMs = 15000) {
  const { controller, timeout } = withTimeout(timeoutMs);
  try {
    const response = await fetch(`${apiBase}/${method}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Telegram ${method} failed: ${response.status} ${text}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function replyKeyboard() {
  return {
    keyboard: [
      [{ text: "Оставить заявку" }],
      [{ text: "Кейсы" }, { text: "Каталог" }],
      [{ text: "OPEN", web_app: { url: config.publicMiniappUrl } }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

function startText() {
  return [
    "Miniapp-консоль для заявок и примеров.",
    "",
    "Здесь только вход и короткие действия. Детали, каталог, цены, нейросети и история открываются в miniapp.",
    "",
    "Доступно:",
    "• оставить заявку",
    "• открыть кейсы",
    "• открыть каталог"
  ].join("\n");
}

function shortText(title, body) {
  return [title, "", body].join("\n");
}

async function send(chatId, text, replyMarkup = undefined) {
  return api("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup
  });
}

async function answerCallback(callbackQueryId) {
  return api("answerCallbackQuery", { callback_query_id: callbackQueryId }, 8000);
}

function requestIntro() {
  return [
    "Напишите задачу одним сообщением.",
    "Я сохраню ее как заявку, и она сразу появится в miniapp.",
    "",
    "Если хотите, добавьте в тексте контекст, бюджет или канал."
  ].join("\n");
}

function catalogIntro() {
  return shortText(
    "Каталог открыт в miniapp.",
    "Там же лежат нейросети, цены, кейсы, заявки и профиль. Для быстрого входа используйте кнопку OPEN ниже."
  );
}

function casesIntro() {
  return shortText(
    "Кейсы открываются в miniapp.",
    "Там собраны примеры работы и сценарии внедрения без лишнего шума."
  );
}

function formatProfile(profile) {
  const lines = [
    `Пользователь: ${profile.displayName}`,
    profile.username ? `@${profile.username}` : null,
    profile.company ? `Компания: ${profile.company}` : null,
    profile.role ? `Роль: ${profile.role}` : null,
    profile.selectedProviderLabel ? `Модель: ${profile.selectedProviderLabel}` : null,
    `Заявок: ${profile.requestsCount || 0}`
  ].filter(Boolean);
  return lines.join("\n");
}

async function showRequestFlow(chatId) {
  const session = getSession(chatId);
  session.awaitingRequest = true;
  await send(chatId, requestIntro(), replyKeyboard());
}

async function showCatalog(chatId, telegramId) {
  saveProfile(telegramId, { preferredTab: "catalog" });
  createEvent({ telegramId, type: "tab_view", value: "catalog", meta: { source: "telegram" } });
  await send(chatId, catalogIntro(), replyKeyboard());
}

async function showCases(chatId, telegramId) {
  saveProfile(telegramId, { preferredTab: "cases" });
  createEvent({ telegramId, type: "tab_view", value: "cases", meta: { source: "telegram" } });
  await send(chatId, casesIntro(), replyKeyboard());
}

async function showProfile(chatId, telegramId) {
  const profile = getProfile(telegramId);
  const requests = listRequests(telegramId, 5);
  const summary = [
    formatProfile({
      ...profile,
      requestsCount: requests.length
    }),
    "",
    "Последние заявки:",
    ...(requests.length ? requests.map((item) => `• ${item.title}`) : ["• Пока нет заявок"])
  ].join("\n");
  await send(chatId, summary, replyKeyboard());
}

async function handleRequestMessage(message) {
  const chatId = message.chat.id;
  const user = ensureUser(message.from);
  const session = getSession(chatId);
  const text = message.text?.trim() || message.caption?.trim() || "";

  if (!text) {
    session.awaitingRequest = false;
    return send(chatId, "Не хватило текста. Напишите задачу одним сообщением.", replyKeyboard());
  }

  const title = text.split(/\r?\n/)[0].slice(0, 80);
  const request = createRequest({
    telegramId: user.telegramId,
    source: "telegram",
    title,
    text,
    category: "general"
  });

  session.awaitingRequest = false;
  saveProfile(user.telegramId, { preferredTab: "requests" });

  return send(
    chatId,
    shortText(
      "Заявка сохранена.",
      `Номер: #${request.id}\nОна уже в miniapp и будет видна в истории.`
    ),
    replyKeyboard()
  );
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text?.trim() || "";
  const user = ensureUser(message.from);
  const session = getSession(chatId);

  if (text === "/start") {
    session.awaitingRequest = false;
    createEvent({ telegramId: user.telegramId, type: "bot_start", value: "start", meta: {} });
    return send(chatId, startText(), replyKeyboard());
  }

  if (session.awaitingRequest && !text.startsWith("/")) {
    return handleRequestMessage(message);
  }

  if (text === "/request" || text === "Оставить заявку") {
    return showRequestFlow(chatId);
  }

  if (text === "/cases" || text === "Кейсы") {
    return showCases(chatId, user.telegramId);
  }

  if (text === "/catalog" || text === "Каталог") {
    return showCatalog(chatId, user.telegramId);
  }

  if (text === "/profile" || text === "Профиль") {
    return showProfile(chatId, user.telegramId);
  }

  if (text === "/open" || text === "OPEN") {
    return send(chatId, "Откройте miniapp кнопкой ниже.", replyKeyboard());
  }

  if (text.startsWith("/")) {
    return send(chatId, "Используйте кнопки ниже или пришлите заявку одним сообщением.", replyKeyboard());
  }

  if (text) {
    return send(chatId, "Нажмите «Оставить заявку» или используйте кнопку OPEN.", replyKeyboard());
  }

  return send(chatId, "Используйте кнопки ниже.", replyKeyboard());
}

async function handleCallbackQuery(callbackQuery) {
  const data = callbackQuery.data || "";
  await answerCallback(callbackQuery.id);
  if (!data) return;

  const chatId = callbackQuery.message?.chat?.id;
  const user = callbackQuery.from ? ensureUser(callbackQuery.from) : null;

  if (data === "open_miniapp" && chatId) {
    await send(chatId, "Откройте miniapp кнопкой OPEN внизу.", replyKeyboard());
  }

  if (data === "request" && chatId) {
    await showRequestFlow(chatId);
  }

  if (data === "catalog" && chatId && user) {
    await showCatalog(chatId, user.telegramId);
  }

  if (data === "cases" && chatId && user) {
    await showCases(chatId, user.telegramId);
  }
}

async function handleUpdate(update) {
  if (update.message) {
    return handleMessage(update.message);
  }

  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query);
  }
}

export async function startBot() {
  let offset = 0;
  let failureDelayMs = 1500;
  let lastFailureLogAt = 0;

  try {
    await api("deleteWebhook", { drop_pending_updates: true }, 15000);
  } catch (error) {
    console.error(`Could not delete webhook on startup: ${error.message}`);
  }

  console.log("Telegram bot polling started");

  while (true) {
    try {
      const response = await api(
        "getUpdates",
        {
          offset,
          timeout: 25,
          allowed_updates: ["message", "callback_query"]
        },
        35000
      );

      failureDelayMs = 1500;

      for (const update of response.result || []) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error) {
      const now = Date.now();
      if (now - lastFailureLogAt > 15000) {
        console.error(`Telegram polling problem: ${error.message}`);
        lastFailureLogAt = now;
      }
      await new Promise((resolve) => setTimeout(resolve, failureDelayMs));
      failureDelayMs = Math.min(failureDelayMs * 1.7, 20000);
    }
  }
}
