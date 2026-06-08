import { config } from "./config.mjs";
import { providerRegistry } from "./data.mjs";
import { describeProfile, formatDecision } from "./recommender.mjs";

const REQUEST_TIMEOUT_MS = 12000;

export function getProviderList({ needsVision = false } = {}) {
  const configuredModel = config.openRouterModel || "";
  const configuredLooksVision = /vision|vl|gpt-4o|gemini/i.test(configuredModel);
  const configuredPrimary = config.openRouterModel
    ? [{
        id: "primary",
        title: "Основная модель",
        model: config.openRouterModel,
        type: configuredLooksVision ? "vision" : "text",
        priority: 0
      }]
    : [];

  const seenModels = new Set();

  return [...configuredPrimary, ...providerRegistry]
    .filter((provider) => !needsVision || provider.type === "vision")
    .filter((provider) => {
      if (seenModels.has(provider.model)) return false;
      seenModels.add(provider.model);
      return true;
    })
    .sort((a, b) => a.priority - b.priority);
}

function withTimeout() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { controller, timeout };
}

function canTryNext(error) {
  const details = String(error.details || error.message || "");
  return (
    error.status === 404 ||
    error.status === 408 ||
    error.status === 429 ||
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    details.includes("No endpoints found")
  );
}

async function requestOpenRouter({ provider, messages, maxTokens }) {
  const { controller, timeout } = withTimeout();
  const startedAt = Date.now();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": config.publicMiniappUrl || "http://localhost:3000/miniapp/",
        "X-Title": "SMB AI Consultant Console"
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      const details = await response.text();
      const error = new Error(`OpenRouter ${response.status}`);
      error.status = response.status;
      error.details = details.slice(0, 220);
      throw error;
    }

    const data = await response.json();
    return {
      provider,
      text: data.choices?.[0]?.message?.content || "",
      latencyMs: Date.now() - startedAt,
      usage: data.usage || null
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(`${provider.title} не ответила за ${REQUEST_TIMEOUT_MS / 1000} секунд`);
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function runWithFallback({ messages, maxTokens, needsVision = false }) {
  if (!config.openRouterApiKey) return null;

  const providers = getProviderList({ needsVision });
  const tried = [];
  let lastError = null;

  for (const provider of providers) {
    tried.push(`${provider.title} (${provider.model})`);
    try {
      return await requestOpenRouter({ provider, messages, maxTokens });
    } catch (error) {
      lastError = error;
      if (!canTryNext(error)) break;
    }
  }

  const reason = lastError?.details || lastError?.message || "провайдер недоступен";
  throw new Error(`${reason}. Проверенные провайдеры: ${tried.join(" -> ")}`);
}

export function estimateSandboxCost({ inputLength = 0, hasImage = false }) {
  const base = hasImage ? 3.8 : 0.8;
  const variable = Math.ceil(inputLength / 1000) * 0.4;
  return Math.max(base + variable, base);
}

export async function runLiveSandbox({ text, imageUrl, recommendation }) {
  const hasImage = Boolean(imageUrl);
  const content = [
    {
      type: "text",
      text:
        "Ты консультант для малого бизнеса. Дай короткий, деловой результат проверки перед покупкой AI-решения. " +
        "Формат: 1) что понял из задачи, 2) короткий тестовый ответ, 3) что подходит лучше всего, 4) риски, 5) следующий шаг. " +
        "Пиши без маркетинга и без длинных объяснений. " +
        `Рекомендация системы: ${recommendation?.title || "не выбрана"}. ` +
        `Запрос пользователя: ${text || "пользователь отправил изображение"}`
    }
  ];

  if (imageUrl) {
    content.push({ type: "image_url", image_url: { url: imageUrl } });
  }

  return runWithFallback({
    needsVision: hasImage,
    maxTokens: 360,
    messages: [{ role: "user", content }]
  });
}

export async function runLiveRecommendation({ profile, recommendations }) {
  return runWithFallback({
    maxTokens: 280,
    messages: [
      {
        role: "system",
        content:
          "Ты B2B-консультант по внедрению AI для малого бизнеса в РФ/СНГ. Пиши кратко, по делу и без маркетинговой воды."
      },
      {
        role: "user",
        content:
          "Сделай короткий управленческий вывод по диагностике. Не меняй рассчитанный топ, а объясни, что внедрять первым, чего избегать и какой первый тест запустить.\n\n" +
          `Профиль:\n${describeProfile(profile)}\n\n` +
          `Расчет:\n${formatDecision(profile, recommendations)}`
      }
    ]
  });
}
