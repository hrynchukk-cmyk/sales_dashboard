import "dotenv/config";
import { Telegraf, Markup, session, type Context } from "telegraf";
import cron from "node-cron";
import { prisma } from "../src/lib/db";
import { getSellerStats } from "../src/lib/stats";
import { gradeModule, nextModule } from "../src/lib/course";
import { startOfDay, formatDateUk } from "../src/lib/dates";
import { saveTelegramPhoto, uah } from "./telegram";

// ── Session / context types ───────────────────────────────────────────
type Flow =
  | { name: "sales" }
  | { name: "bonus"; type: string }
  | { name: "bonus_pick" }
  | { name: "test"; moduleId: string; qIdx: number; answers: number[] }
  | { name: "product"; step: number; data: Record<string, string | number> };

interface SessionData {
  flow?: Flow;
}
interface BotContext extends Context {
  session: SessionData;
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log("\n⚠  TELEGRAM_BOT_TOKEN не заданий.");
  console.log("   1. Створіть бота через @BotFather у Telegram і отримайте токен.");
  console.log("   2. Додайте у .env рядок: TELEGRAM_BOT_TOKEN=\"<ваш токен>\"");
  console.log("   3. (Опційно) TELEGRAM_BOT_USERNAME=\"<імʼя_бота>\" — для інвайт-посилань у веб-панелі.");
  console.log("   4. Запустіть знову: npm run bot\n");
  process.exit(0);
}

const bot = new Telegraf<BotContext>(token);
bot.use(session({ defaultSession: (): SessionData => ({}) }));

// ── Menu labels ───────────────────────────────────────────────────────
const BTN = {
  balance: "📊 Баланс",
  sales: "➕ Внести продажі",
  bonus: "⭐ Бонусна активність",
  catalog: "📦 Каталог",
  addProduct: "🛍 Додати товар",
  course: "🎓 Курс",
};

function mainMenu() {
  return Markup.keyboard([
    [BTN.sales, BTN.balance],
    [BTN.bonus, BTN.catalog],
    [BTN.addProduct, BTN.course],
  ]).resize();
}

// ── Helpers ───────────────────────────────────────────────────────────
async function getSeller(ctx: BotContext) {
  if (!ctx.from) return null;
  return prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) } });
}

/** Loads the seller; replies and returns null if not linked / blocked. */
async function requireSeller(ctx: BotContext) {
  const seller = await getSeller(ctx);
  if (!seller) {
    await ctx.reply(
      "Ваш акаунт не привʼязано. Скористайтесь персональним посиланням-запрошенням від адміністратора або командою /start <код>."
    );
    return null;
  }
  if (seller.status === "BLOCKED") {
    await ctx.reply("Ваш акаунт заблоковано. Зверніться до адміністратора.");
    return null;
  }
  return seller;
}

// ── /start  (links account via invite code, then routes) ──────────────
bot.start(async (ctx) => {
  const payload = (ctx.startPayload || "").trim().toUpperCase();
  let seller = await getSeller(ctx);

  if (!seller && payload) {
    const target = await prisma.user.findUnique({ where: { inviteCode: payload } });
    if (target && target.role === "SELLER") {
      if (target.telegramId && target.telegramId !== String(ctx.from.id)) {
        await ctx.reply("Цей код вже використано іншим акаунтом. Зверніться до адміністратора.");
        return;
      }
      seller = await prisma.user.update({
        where: { id: target.id },
        data: { telegramId: String(ctx.from.id) },
      });
      await ctx.reply(`✅ Вітаємо, ${seller.name}! Ваш акаунт привʼязано.`);
    } else {
      await ctx.reply("Невірний код запрошення. Перевірте посилання від адміністратора.");
      return;
    }
  }

  if (!seller) {
    await ctx.reply(
      "👋 Вітаємо у Sales Platform!\n\nЩоб почати, відкрийте персональне посилання-запрошення від адміністратора, або введіть: /start <код>"
    );
    return;
  }

  await routeAfterAuth(ctx, seller);
});

async function routeAfterAuth(ctx: BotContext, seller: { id: string; name: string; onboardingDone: boolean }) {
  if (!seller.onboardingDone) {
    await ctx.reply(
      "🎓 Перед роботою потрібно пройти обовʼязковий онбординг курс. Решта функцій буде розблокована після успішного завершення."
    );
    await presentNextModule(ctx, seller.id);
  } else {
    await ctx.reply(`Головне меню. Чим можу допомогти?`, mainMenu());
  }
}

// ── Onboarding course ─────────────────────────────────────────────────
async function presentNextModule(ctx: BotContext, userId: string) {
  const module = await nextModule(userId);
  if (!module) {
    await prisma.user.update({ where: { id: userId }, data: { onboardingDone: true } });
    await ctx.reply("🎉 Онбординг завершено! Усі функції розблоковано.", mainMenu());
    return;
  }

  const photos: string[] = JSON.parse(module.photos || "[]");
  let text = `📘 *Модуль ${module.order}: ${module.title}*\n\n${module.textContent}`;
  if (module.videoUrl) text += `\n\n🎬 Відео: ${module.videoUrl}`;
  await ctx.replyWithMarkdown(text);
  for (const p of photos.slice(0, 5)) {
    const url = p.startsWith("http") ? p : `${process.env.PUBLIC_BASE_URL ?? ""}${p}`;
    try {
      await ctx.replyWithPhoto(url);
    } catch {
      /* ignore unreachable local photos */
    }
  }

  if (module.questions.length === 0) {
    // No test → auto-complete this module.
    await gradeModule(userId, module.id, []);
    await ctx.reply("Модуль не містить тесту — зараховано ✓");
    await presentNextModule(ctx, userId);
    return;
  }

  await ctx.reply(
    `Готові пройти тест по модулю? Прохідний бал: ${module.passScore}%`,
    Markup.inlineKeyboard([Markup.button.callback("▶️ Почати тест", `test:${module.id}`)])
  );
}

bot.action(/^test:(.+)$/, async (ctx) => {
  const seller = await requireSeller(ctx);
  if (!seller) return ctx.answerCbQuery();
  const moduleId = ctx.match[1];
  ctx.session.flow = { name: "test", moduleId, qIdx: 0, answers: [] };
  await ctx.answerCbQuery();
  await sendQuestion(ctx, moduleId, 0);
});

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];

async function sendQuestion(ctx: BotContext, moduleId: string, qIdx: number) {
  const module = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!module) return;
  const q = module.questions[qIdx];
  if (!q) return;
  const options: string[] = JSON.parse(q.options || "[]");
  const buttons = options.map((opt, i) =>
    [Markup.button.callback(`${LETTERS[i]}. ${opt}`.slice(0, 60), `ans:${i}`)]
  );
  await ctx.reply(
    `❓ Питання ${qIdx + 1}/${module.questions.length}\n\n${q.text}`,
    Markup.inlineKeyboard(buttons)
  );
}

bot.action(/^ans:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const flow = ctx.session.flow;
  if (!flow || flow.name !== "test") return;
  const seller = await getSeller(ctx);
  if (!seller) return;

  flow.answers[flow.qIdx] = Number(ctx.match[1]);

  const module = await prisma.courseModule.findUnique({
    where: { id: flow.moduleId },
    include: { questions: true },
  });
  if (!module) return;

  if (flow.qIdx + 1 < module.questions.length) {
    flow.qIdx += 1;
    await sendQuestion(ctx, flow.moduleId, flow.qIdx);
    return;
  }

  // Last question answered → grade.
  const result = await gradeModule(seller.id, flow.moduleId, flow.answers);
  ctx.session.flow = undefined;
  if (!result) return;

  if (result.passed) {
    await ctx.reply(`✅ Модуль пройдено! Результат: ${result.score}%`);
    await presentNextModule(ctx, seller.id);
  } else {
    await ctx.reply(
      `❌ Результат: ${result.score}%. Потрібно мінімум ${result.passScore}%.\nПерегляньте матеріал і спробуйте ще раз.`
    );
    await presentNextModule(ctx, seller.id);
  }
});

// ── Onboarding gate for menu actions ──────────────────────────────────
async function requireOnboarded(ctx: BotContext) {
  const seller = await requireSeller(ctx);
  if (!seller) return null;
  if (!seller.onboardingDone) {
    await ctx.reply("🔒 Спочатку завершіть онбординг курс.");
    await presentNextModule(ctx, seller.id);
    return null;
  }
  return seller;
}

// ── Balance ───────────────────────────────────────────────────────────
async function showBalance(ctx: BotContext, sellerId: string) {
  const s = await getSellerStats(sellerId);
  const remainMonth = Math.max(0, s.monthlyPlan - s.monthSales);
  await ctx.replyWithMarkdown(
    `📊 *Ваш баланс за місяць*\n\n` +
      `Продажі: *${uah(s.monthSales)}* з плану ${uah(s.monthlyPlan)} (${s.monthPct}%)\n` +
      `Тиждень: ${uah(s.weekSales)} з ${uah(s.weeklyPlan)} (${s.weekPct}%)\n` +
      `Залишок до міс. плану: ${uah(remainMonth)}\n\n` +
      `💰 Заробіток (% від продажів): *${uah(s.earnings)}*\n` +
      `⭐ Бонуси: *${uah(s.bonuses)}*\n` +
      `🟰 Разом: *${uah(s.total)}*`
  );
}

bot.command("balance", async (ctx) => {
  const s = await requireOnboarded(ctx);
  if (s) await showBalance(ctx, s.id);
});
bot.hears(BTN.balance, async (ctx) => {
  const s = await requireOnboarded(ctx);
  if (s) await showBalance(ctx, s.id);
});

// ── Sales entry ───────────────────────────────────────────────────────
bot.hears(BTN.sales, async (ctx) => {
  const s = await requireOnboarded(ctx);
  if (!s) return;
  ctx.session.flow = { name: "sales" };
  await ctx.reply(`💵 Введіть суму продажів за сьогодні (${formatDateUk(new Date())}), ₴:`);
});
bot.command("sales", async (ctx) => {
  const s = await requireOnboarded(ctx);
  if (!s) return;
  ctx.session.flow = { name: "sales" };
  await ctx.reply("💵 Введіть суму продажів за сьогодні, ₴:");
});

// ── Bonus activity ────────────────────────────────────────────────────
const BONUS_TYPES = ["Instagram", "Facebook", "TikTok", "OLX", "Сайт", "Інше"];

bot.hears(BTN.bonus, async (ctx) => {
  const s = await requireOnboarded(ctx);
  if (!s) return;
  ctx.session.flow = { name: "bonus_pick" };
  await ctx.reply(
    "Оберіть тип активності:",
    Markup.inlineKeyboard(BONUS_TYPES.map((t) => [Markup.button.callback(t, `btype:${t}`)]))
  );
});

bot.action(/^btype:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const s = await requireOnboarded(ctx);
  if (!s) return;
  ctx.session.flow = { name: "bonus", type: ctx.match[1] };
  await ctx.reply(`Тип: ${ctx.match[1]}\nНадішліть *посилання* або *скріншот* активності.`, { parse_mode: "Markdown" });
});

// ── Catalog ───────────────────────────────────────────────────────────
async function showCatalog(ctx: BotContext) {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 15 });
  if (products.length === 0) {
    await ctx.reply("Каталог порожній.");
    return;
  }
  const lines = products.map(
    (p) =>
      `• *${p.name}* — ${uah(p.price)}\n  ${[p.category, p.color, p.size, p.gender].filter(Boolean).join(" / ")}${p.article ? ` · Арт: ${p.article}` : ""}`
  );
  await ctx.replyWithMarkdown(`📦 *Каталог товарів*\n\n${lines.join("\n\n")}`);
}
bot.hears(BTN.catalog, async (ctx) => {
  if (await requireOnboarded(ctx)) await showCatalog(ctx);
});
bot.command("catalog", async (ctx) => {
  if (await requireOnboarded(ctx)) await showCatalog(ctx);
});

// ── Add product (step-by-step) ────────────────────────────────────────
const PRODUCT_STEPS: { key: string; prompt: string }[] = [
  { key: "name", prompt: "Назва товару:" },
  { key: "price", prompt: "Ціна (₴):" },
  { key: "category", prompt: "Категорія (або «-»):" },
  { key: "color", prompt: "Колір (або «-»):" },
  { key: "size", prompt: "Розмір (або «-»):" },
  { key: "gender", prompt: "Стать: Жіночий / Чоловічий / Унісекс (або «-»):" },
  { key: "article", prompt: "Артикул (або «-»):" },
];

bot.hears(BTN.addProduct, async (ctx) => {
  const s = await requireOnboarded(ctx);
  if (!s) return;
  ctx.session.flow = { name: "product", step: 0, data: {} };
  await ctx.reply(`🛍 Додавання товару (крок 1/${PRODUCT_STEPS.length}).\n${PRODUCT_STEPS[0].prompt}`);
});

// ── Course button (review / resume) ───────────────────────────────────
bot.hears(BTN.course, async (ctx) => {
  const seller = await requireSeller(ctx);
  if (!seller) return;
  if (seller.onboardingDone) {
    await ctx.reply("✅ Ви вже пройшли онбординг курс.");
  } else {
    await presentNextModule(ctx, seller.id);
  }
});

// ── Photo handler (bonus screenshot / product photo) ──────────────────
bot.on("photo", async (ctx) => {
  const flow = ctx.session.flow;
  const seller = await getSeller(ctx);
  if (!seller || !flow) return;
  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1].file_id;

  if (flow.name === "bonus") {
    const url = await saveTelegramPhoto(ctx, fileId);
    await finalizeBonus(ctx, seller.id, flow.type, null, url);
    return;
  }
  if (flow.name === "product") {
    const url = await saveTelegramPhoto(ctx, fileId);
    flow.data.photoUrl = url ?? "";
    await ctx.reply("Фото додано ✓");
    await advanceProduct(ctx, seller.id);
  }
});

// ── Generic text handler (flow input) ─────────────────────────────────
bot.on("text", async (ctx) => {
  const flow = ctx.session.flow;
  if (!flow) {
    // Idle: nudge to the menu.
    const seller = await getSeller(ctx);
    if (seller?.onboardingDone) await ctx.reply("Скористайтесь меню 👇", mainMenu());
    return;
  }
  const seller = await getSeller(ctx);
  if (!seller) return;
  const text = ctx.message.text.trim();

  if (flow.name === "sales") {
    const amount = Number(text.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      await ctx.reply("Введіть коректну суму, напр. 3500");
      return;
    }
    const date = startOfDay(new Date());
    await prisma.salesRecord.upsert({
      where: { userId_date: { userId: seller.id, date } },
      create: { userId: seller.id, date, amount },
      update: { amount },
    });
    ctx.session.flow = undefined;
    const s = await getSellerStats(seller.id);
    const remain = Math.max(0, s.monthlyPlan - s.monthSales);
    await ctx.reply(
      `✅ Записано ${uah(amount)} за сьогодні.\n\n` +
        `Тиждень: ${s.weekPct}% · Місяць: ${s.monthPct}%\n` +
        `До міс. плану залишилось: ${uah(remain)}`,
      mainMenu()
    );
    return;
  }

  if (flow.name === "bonus") {
    await finalizeBonus(ctx, seller.id, flow.type, text, null);
    return;
  }

  if (flow.name === "product") {
    const step = PRODUCT_STEPS[flow.step];
    const value = text === "-" ? "" : text;
    if (step.key === "price") {
      flow.data.price = Number(value.replace(/[^\d.]/g, "")) || 0;
    } else {
      flow.data[step.key] = value;
    }
    await advanceProduct(ctx, seller.id);
    return;
  }
});

async function advanceProduct(ctx: BotContext, userId: string) {
  const flow = ctx.session.flow;
  if (!flow || flow.name !== "product") return;
  flow.step += 1;
  if (flow.step < PRODUCT_STEPS.length) {
    await ctx.reply(`Крок ${flow.step + 1}/${PRODUCT_STEPS.length}.\n${PRODUCT_STEPS[flow.step].prompt}`);
    return;
  }
  const d = flow.data;
  await prisma.product.create({
    data: {
      name: String(d.name || "Без назви"),
      price: Number(d.price) || 0,
      category: String(d.category || ""),
      color: String(d.color || ""),
      size: String(d.size || ""),
      gender: String(d.gender || ""),
      article: String(d.article || ""),
      photoUrl: (d.photoUrl as string) || null,
      description: "",
      createdById: userId,
    },
  });
  ctx.session.flow = undefined;
  await ctx.reply(`✅ Товар «${d.name}» додано до каталогу.`, mainMenu());
}

async function finalizeBonus(
  ctx: BotContext,
  userId: string,
  type: string,
  link: string | null,
  screenshotUrl: string | null
) {
  const settings = await prisma.settings.findFirst();
  const amount = settings?.bonusPerActivity ?? 150;
  await prisma.bonusActivity.create({
    data: { userId, type, link, screenshotUrl, amount, status: "PENDING", description: "" },
  });
  ctx.session.flow = undefined;
  await ctx.reply(
    `✅ Активність (${type}) надіслано на перевірку. Після підтвердження адміном буде нараховано ${uah(amount)}.`,
    mainMenu()
  );
}

// ── Daily reminder (SoW 2.3) ──────────────────────────────────────────
// Runs every day at 19:00 server time; pings sellers with no record today.
cron.schedule("0 19 * * *", async () => {
  const today = startOfDay(new Date());
  const sellers = await prisma.user.findMany({
    where: { role: "SELLER", onboardingDone: true, telegramId: { not: null }, status: "ACTIVE" },
  });
  for (const s of sellers) {
    const rec = await prisma.salesRecord.findUnique({
      where: { userId_date: { userId: s.id, date: today } },
    });
    if (!rec && s.telegramId) {
      try {
        await bot.telegram.sendMessage(
          s.telegramId,
          "⏰ Нагадування: ви ще не внесли суму продажів за сьогодні. Натисніть «➕ Внести продажі»."
        );
      } catch {
        /* user may have blocked the bot */
      }
    }
  }
  console.log("[cron] daily reminders sent");
});

// ── Launch ────────────────────────────────────────────────────────────
bot.launch(() => console.log("🤖 Telegram бот запущено."));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
