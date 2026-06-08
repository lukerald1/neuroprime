import {
  budgets,
  channels,
  dataTypes,
  industries,
  promptPacks,
  regions,
  skills,
  tasks,
  titleById
} from "./data.mjs";

const skillOrder = { none: 0, basic: 1, team: 2 };

export const solutionCatalog = [
  {
    id: "ru-support-bot",
    title: "Российский AI-бот поддержки",
    providers: ["GigaChat", "YandexGPT"],
    monthlyRub: 6000,
    bestFor: ["support", "sales"],
    channels: ["telegram", "website", "omni"],
    data: ["text", "docs"],
    regionFit: ["ru_only", "mixed"],
    minSkill: "none",
    quality: 78,
    effort: "1-2 недели",
    whyFirst: "меньше проблем с оплатой, русским языком и подключением к привычным каналам",
    tradeoffs: "качество сложных рассуждений ниже, чем у топовых западных моделей"
  },
  {
    id: "global-quality-copilot",
    title: "Качественный универсальный AI-копилот",
    providers: ["OpenAI", "Claude", "Gemini"],
    monthlyRub: 18000,
    bestFor: ["content", "docs", "analytics", "support"],
    channels: ["telegram", "website", "internal", "omni"],
    data: ["text", "docs", "mixed"],
    regionFit: ["mixed", "quality_first"],
    minSkill: "basic",
    quality: 93,
    effort: "2-4 недели",
    whyFirst: "лучше для качества ответов, документов, аналитики и сложных бизнес-задач",
    tradeoffs: "нужны аккуратные настройки доступа, оплаты и лимитов"
  },
  {
    id: "low-cost-open-model",
    title: "Бюджетная связка через open-source / китайские модели",
    providers: ["DeepSeek", "Qwen", "Mistral"],
    monthlyRub: 4500,
    bestFor: ["analytics", "content", "support"],
    channels: ["telegram", "internal"],
    data: ["text", "docs"],
    regionFit: ["mixed", "ru_only"],
    minSkill: "basic",
    quality: 84,
    effort: "1-3 недели",
    whyFirst: "хороший баланс цены и качества для пилота без больших расходов",
    tradeoffs: "нужна проверка стабильности конкретного API и качества русских ответов"
  },
  {
    id: "vision-product-assistant",
    title: "AI для фото товаров и визуального контроля",
    providers: ["Gemini Vision", "Qwen VL", "GPT-4o"],
    monthlyRub: 12000,
    bestFor: ["vision", "content", "sales"],
    channels: ["telegram", "website", "internal"],
    data: ["image", "mixed"],
    regionFit: ["mixed", "quality_first"],
    minSkill: "basic",
    quality: 88,
    effort: "2-4 недели",
    whyFirst: "подходит для карточек товаров, фото, витрин и первичной модерации",
    tradeoffs: "качество сильно зависит от фотографий и формата входных данных"
  },
  {
    id: "internal-knowledge-base",
    title: "Внутренняя база знаний с AI-поиском",
    providers: ["YandexGPT", "GigaChat", "Mistral", "OpenAI"],
    monthlyRub: 25000,
    bestFor: ["docs", "analytics", "support"],
    channels: ["internal", "omni"],
    data: ["docs", "mixed"],
    regionFit: ["ru_only", "mixed", "quality_first"],
    minSkill: "team",
    quality: 86,
    effort: "3-6 недель",
    whyFirst: "дает управляемый эффект: меньше ручного поиска по документам и регламентам",
    tradeoffs: "нужны подготовка документов, права доступа и контроль качества ответов"
  }
];

function getBudget(profile) {
  return budgets.find((item) => item.id === profile.budget)?.monthlyRub || 5000;
}

function scoreSolution(solution, profile) {
  const budget = getBudget(profile);
  let score = Math.round(solution.quality * 0.35);
  const reasons = [];
  const risks = [];

  if (solution.bestFor.includes(profile.task)) {
    score += 24;
    reasons.push("попадает в основную бизнес-задачу");
  }

  if (solution.channels.includes(profile.channel)) {
    score += 12;
    reasons.push("подходит под выбранный канал внедрения");
  }

  if (solution.data.includes(profile.dataType)) {
    score += 12;
    reasons.push("подходит под тип данных");
  }

  if (solution.monthlyRub <= budget) {
    score += 16;
    reasons.push("укладывается в бюджет пилота");
  } else {
    const ratio = solution.monthlyRub / budget;
    score -= ratio > 3 ? 22 : 12;
    risks.push("может выйти за рамки бюджета");
  }

  if (solution.regionFit.includes(profile.region)) {
    score += 12;
    reasons.push("учитывает ограничения региона и оплаты");
  } else {
    score -= 10;
    risks.push("есть региональные или платежные ограничения");
  }

  if (skillOrder[profile.skill] >= skillOrder[solution.minSkill]) {
    score += 10;
    reasons.push("реалистично внедрить с текущими ИТ-навыками");
  } else {
    score -= 14;
    risks.push("потребуется интегратор или ИТ-специалист");
  }

  return {
    ...solution,
    score: Math.min(100, Math.max(0, Math.round(score))),
    reasons: reasons.slice(0, 4),
    risks
  };
}

export function recommend(profile) {
  return solutionCatalog
    .map((solution) => scoreSolution(solution, profile))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function describeProfile(profile) {
  return [
    `Отрасль: ${titleById(industries, profile.industry)}`,
    `Задача: ${titleById(tasks, profile.task)}`,
    `Канал: ${titleById(channels, profile.channel)}`,
    `Данные: ${titleById(dataTypes, profile.dataType)}`,
    `Бюджет: ${titleById(budgets, profile.budget)}`,
    `ИТ-навыки: ${titleById(skills, profile.skill)}`,
    `Ограничения: ${titleById(regions, profile.region)}`
  ].join("\n");
}

export function getPromptPack(taskId) {
  if (taskId === "sales") return promptPacks.find((pack) => pack.id === "sales");
  if (taskId === "support") return promptPacks.find((pack) => pack.id === "support");
  if (taskId === "content") return promptPacks.find((pack) => pack.id === "content");
  if (taskId === "docs" || taskId === "analytics") return promptPacks.find((pack) => pack.id === "docs");
  if (taskId === "vision") return promptPacks.find((pack) => pack.id === "vision");
  return promptPacks[0];
}

export function formatDecision(profile, recommendations) {
  if (!recommendations.length) return "Пока нет рекомендации. Пройдите короткую диагностику.";

  const [best, backup] = recommendations;
  const promptPack = getPromptPack(profile.task);

  return [
    "Решение для пилота",
    "",
    `1. Что внедрять первым: ${best.title}`,
    `Оценка соответствия: ${best.score}/100`,
    `Провайдеры-кандидаты: ${best.providers.join(", ")}`,
    `Бюджетный ориентир: ${best.monthlyRub.toLocaleString("ru-RU")} ₽/мес`,
    `Срок пилота: ${best.effort}`,
    "",
    `Почему это подходит: ${best.reasons.join("; ") || best.whyFirst}.`,
    `Компромисс: ${best.tradeoffs}.`,
    best.risks.length ? `Риски: ${best.risks.join("; ")}.` : "Риски: критичных ограничений для пилота не видно.",
    "",
    backup ? `2. Запасной вариант: ${backup.title} (${backup.score}/100)` : "",
    backup ? `Когда выбрать запасной: если основной вариант не пройдет по доступности, цене или качеству на тесте.` : "",
    "",
    `Промпт-пак: ${promptPack.title}`,
    `Сценарий: ${promptPack.useCase}`,
    `Стартовый промпт: ${promptPack.prompt}`
  ].filter(Boolean).join("\n");
}

export function formatComparison(recommendations) {
  if (!recommendations.length) return "Нет данных для сравнения. Сначала пройдите диагностику.";

  return recommendations
    .map((item, index) => (
      `${index + 1}. ${item.title}\n` +
      `Скоринг: ${item.score}/100\n` +
      `Цена: ${item.monthlyRub.toLocaleString("ru-RU")} ₽/мес\n` +
      `Срок: ${item.effort}\n` +
      `Провайдеры: ${item.providers.join(", ")}\n` +
      `Минус: ${item.tradeoffs}`
    ))
    .join("\n\n");
}
