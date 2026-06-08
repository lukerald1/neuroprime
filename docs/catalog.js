export const industries = [
  { id: "retail", title: "Розница" },
  { id: "food", title: "Кафе и доставка" },
  { id: "services", title: "Услуги" },
  { id: "education", title: "Образование" },
  { id: "manufacturing", title: "Производство" },
  { id: "ecommerce", title: "Интернет-магазин" }
];

export const budgets = [
  { id: "micro", title: "до 5 тыс ₽/мес", monthlyRub: 5000 },
  { id: "small", title: "5-20 тыс ₽/мес", monthlyRub: 20000 },
  { id: "growth", title: "20-70 тыс ₽/мес", monthlyRub: 70000 },
  { id: "scale", title: "70 тыс ₽+", monthlyRub: 150000 }
];

export const skills = [
  { id: "none", title: "ИТ-специалиста нет" },
  { id: "basic", title: "Есть базовые навыки" },
  { id: "team", title: "Есть свой ИТ/интегратор" }
];

export const tasks = [
  { id: "support", title: "Поддержка клиентов" },
  { id: "sales", title: "Продажи и лиды" },
  { id: "content", title: "Тексты и маркетинг" },
  { id: "docs", title: "Документы и регламенты" },
  { id: "analytics", title: "Аналитика и отчеты" },
  { id: "vision", title: "Фото, товары, видео" }
];

export const channels = [
  { id: "telegram", title: "Telegram-бот" },
  { id: "website", title: "Сайт / виджет" },
  { id: "internal", title: "Внутренний сервис" },
  { id: "omni", title: "Омниканал" }
];

export const dataTypes = [
  { id: "text", title: "Текст и диалоги" },
  { id: "docs", title: "Файлы и документы" },
  { id: "image", title: "Изображения" },
  { id: "mixed", title: "Смешанные данные" }
];

export const regions = [
  { id: "ru_only", title: "Нужна работа в РФ/СНГ" },
  { id: "mixed", title: "Можно глобальные сервисы" },
  { id: "quality_first", title: "Главное качество" }
];

export const promptPacks = [
  {
    id: "sales",
    title: "Продажи",
    useCase: "Ответы на лиды, FAQ, скрипты менеджера",
    prompt: "Ты консультант отдела продаж. Кратко ответь на запрос клиента, задай 1 уточняющий вопрос и предложи следующий шаг."
  },
  {
    id: "support",
    title: "Поддержка",
    useCase: "Саппорт, база знаний, снижение нагрузки",
    prompt: "Ты оператор поддержки. Дай точный, вежливый и короткий ответ по базе знаний компании. Если данных не хватает, перечисли, что нужно уточнить."
  },
  {
    id: "content",
    title: "Контент",
    useCase: "Посты, карточки товаров, описания",
    prompt: "Ты маркетолог малого бизнеса. Создай 3 варианта текста: короткий, средний и продающий. Учитывай стиль бренда и ограничение по длине."
  },
  {
    id: "docs",
    title: "Документы",
    useCase: "Договоры, инструкции, регламенты",
    prompt: "Ты бизнес-аналитик. Кратко перескажи документ, выдели риски, обязательства и действия по пунктам."
  },
  {
    id: "vision",
    title: "Фото товаров",
    useCase: "Анализ изображений, товары, витрина",
    prompt: "Проанализируй изображение с точки зрения малого бизнеса: что на нем видно, какие есть проблемы качества и как использовать это для продажи."
  }
];

export const providerRegistry = [
  {
    id: "openai",
    title: "OpenAI",
    model: process.env.OPENROUTER_OPENAI_MODEL || "openai/gpt-4o-mini",
    type: "text",
    priority: 1
  },
  {
    id: "gemini",
    title: "Gemini",
    model: process.env.OPENROUTER_GEMINI_MODEL || "google/gemini-2.0-flash-001",
    type: "text",
    priority: 2
  },
  {
    id: "mistral",
    title: "Mistral",
    model: process.env.OPENROUTER_MISTRAL_MODEL || "mistralai/mistral-small-3.1-24b-instruct",
    type: "text",
    priority: 3
  },
  {
    id: "qwen",
    title: "Qwen",
    model: process.env.OPENROUTER_QWEN_MODEL || "qwen/qwen2.5-vl-32b-instruct",
    type: "vision",
    priority: 4
  },
  {
    id: "deepseek",
    title: "DeepSeek",
    model: process.env.OPENROUTER_DEEPSEEK_MODEL || "deepseek/deepseek-chat",
    type: "text",
    priority: 5
  }
];

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

const skillOrder = { none: 0, basic: 1, team: 2 };

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
  if (!recommendations.length) return "Пока нет рекомендаций. Пройдите короткую диагностику.";

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

export const caseStudies = [
  {
    id: "support-load",
    title: "Саппорт без очередей",
    theme: "Поддержка",
    model: "Российский AI-бот поддержки",
    summary: "Бот отвечает на типовые вопросы, а сложные заявки уходит в ручную обработку.",
    result: "Снизили ручную нагрузку на первую линию и ускорили ответ клиенту."
  },
  {
    id: "sales-qualify",
    title: "Квалификация лидов",
    theme: "Продажи",
    model: "Качественный универсальный AI-копилот",
    summary: "Модель собирает контекст, уточняет задачу и подготавливает менеджеру короткий бриф.",
    result: "Менеджеры получили более чистые лиды и меньше рутины на первичном контакте."
  },
  {
    id: "docs-search",
    title: "Поиск по регламентам",
    theme: "Документы",
    model: "Внутренняя база знаний с AI-поиском",
    summary: "Сотрудники ищут правила в документах через естественный запрос, а не вручную.",
    result: "Время на поиск ответа сократилось с минут до секунд."
  },
  {
    id: "vision-check",
    title: "Проверка фото товаров",
    theme: "Визуальный контроль",
    model: "AI для фото товаров и визуального контроля",
    summary: "Сценарий помогает заметить брак, артефакты и слабые карточки до публикации.",
    result: "Снижается число ошибок в витрине и ускоряется первичная модерация."
  }
];

export function createAnalyticsStats(userId) {
  const seed = Number(String(userId).slice(-4)) || 137;
  return {
    balanceRub: 3900 + (seed % 9) * 450,
    topUpsRub: 12000 + (seed % 7) * 1700,
    tokensUsed: 154000 + (seed % 11) * 7200,
    estimatedSavingsRub: 34000 + (seed % 13) * 2200,
    roi: 2.4 + ((seed % 8) / 10),
    testsRun: 12 + (seed % 6),
    modelsUsed: [
      { title: "OpenAI", tokens: 52000, costRub: 940 },
      { title: "Gemini", tokens: 43000, costRub: 420 },
      { title: "Mistral", tokens: 69000, costRub: 510 }
    ],
    history: [
      "Подбор решения для клиентской поддержки",
      "Тест генерации карточек товаров",
      "Расчет окупаемости сценария",
      "Кейс по документам и регламентам"
    ]
  };
}

export const createDemoStats = createAnalyticsStats;

export function titleById(items, id) {
  return items.find((item) => item.id === id)?.title || "Не указано";
}
