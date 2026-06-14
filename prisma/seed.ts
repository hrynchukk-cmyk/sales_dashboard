import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function main() {
  console.log("🌱 Seeding...");

  // Clean slate
  await prisma.testAttempt.deleteMany();
  await prisma.moduleProgress.deleteMany();
  await prisma.testQuestion.deleteMany();
  await prisma.courseModule.deleteMany();
  await prisma.salesRecord.deleteMany();
  await prisma.bonusActivity.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  const pass = await bcrypt.hash("password", 10);

  await prisma.settings.create({
    data: { id: 1, bonusPerActivity: 150, companyName: "Sales Platform" },
  });

  // ── Admin ──────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      name: "Адміністратор",
      email: "admin@company.com",
      passwordHash: pass,
      role: "ADMIN",
      onboardingDone: true,
    },
  });

  // ── Course modules ─────────────────────────────────────────────────
  const modulesData = [
    {
      title: "Про компанію",
      textContent:
        "Ласкаво просимо до команди! У цьому модулі ви дізнаєтесь про історію компанії, наші цінності, асортимент та стандарти обслуговування клієнтів.",
      questions: [
        {
          text: "Що є головним пріоритетом компанії у роботі з клієнтами?",
          options: ["Швидкість продажу", "Якісний сервіс та довіра", "Найнижча ціна", "Великий асортимент"],
          correctIndex: 1,
        },
        {
          text: "Скільки продавців у штаті компанії?",
          options: ["1-4", "5-15", "20-50", "понад 100"],
          correctIndex: 1,
        },
      ],
    },
    {
      title: "Процес продажів",
      textContent:
        "Описуються ключові кроки процесу продажу: знайомство з клієнтом, виявлення потреби, презентація товару, робота із запереченнями та закриття угоди.",
      questions: [
        {
          text: "Який перший крок у процесі продажу відповідно до стандарту компанії?",
          options: [
            "Презентація товару",
            "Знайомство з клієнтом та виявлення потреби",
            "Закриття угоди",
            "Робота із запереченнями",
          ],
          correctIndex: 1,
        },
        {
          text: "Що робити при запереченні клієнта?",
          options: [
            "Ігнорувати",
            "Тиснути на клієнта",
            "Вислухати, зрозуміти та аргументовано відповісти",
            "Одразу знижувати ціну",
          ],
          correctIndex: 2,
        },
      ],
    },
    {
      title: "Робота з системою",
      textContent:
        "У цьому модулі ви навчитесь щоденно вносити продажі, відстежувати виконання плану, додавати бонусні активності та користуватись каталогом товарів.",
      questions: [
        {
          text: "Як часто потрібно вносити суму продажів?",
          options: ["Раз на місяць", "Раз на тиждень", "Щодня", "За бажанням"],
          correctIndex: 2,
        },
        {
          text: "Що потрібно для нарахування бонусу за активність?",
          options: [
            "Нічого",
            "Посилання та/або скріншот і підтвердження адміном",
            "Лише усна згода",
            "Оплата",
          ],
          correctIndex: 1,
        },
      ],
    },
  ];

  const modules = [];
  for (let i = 0; i < modulesData.length; i++) {
    const md = modulesData[i];
    const mod = await prisma.courseModule.create({
      data: {
        order: i + 1,
        title: md.title,
        textContent: md.textContent,
        passScore: 80,
        questions: {
          create: md.questions.map((q, qi) => ({
            order: qi,
            text: q.text,
            options: JSON.stringify(q.options),
            correctIndex: q.correctIndex,
          })),
        },
      },
    });
    modules.push(mod);
  }

  // ── Sellers ────────────────────────────────────────────────────────
  const sellersData = [
    { name: "Олена Коваль", email: "olena@company.com", percent: 15, weekly: 18000, monthly: 72000, onboarding: "done" },
    { name: "Максим Ткаченко", email: "maksym@company.com", percent: 12, weekly: 22000, monthly: 88000, onboarding: "done" },
    { name: "Іванна Сидоренко", email: "ivanna@company.com", percent: 10, weekly: 15000, monthly: 60000, onboarding: "stage2" },
    { name: "Роман Дяченко", email: "roman@company.com", percent: 10, weekly: 15000, monthly: 60000, onboarding: "done" },
    { name: "Катерина Мельник", email: "kateryna@company.com", percent: 10, weekly: 0, monthly: 0, onboarding: "none" },
  ];

  const now = new Date();
  const monthStart = startOfMonth(now);

  for (const sd of sellersData) {
    const user = await prisma.user.create({
      data: {
        name: sd.name,
        email: sd.email,
        passwordHash: pass,
        role: "SELLER",
        earningPercent: sd.percent,
        weeklyPlan: sd.weekly,
        monthlyPlan: sd.monthly,
        onboardingDone: sd.onboarding === "done",
      },
    });

    // Onboarding progress
    if (sd.onboarding === "done") {
      for (const mod of modules) {
        await prisma.moduleProgress.create({
          data: { userId: user.id, moduleId: mod.id, completed: true, bestScore: 90 + Math.floor(Math.random() * 10) },
        });
      }
    } else if (sd.onboarding === "stage2") {
      await prisma.moduleProgress.create({
        data: { userId: user.id, moduleId: modules[0].id, completed: true, bestScore: 85 },
      });
    }

    // Sales records for completed-onboarding sellers (this month)
    if (sd.onboarding === "done") {
      const days = Math.min(20, now.getDate());
      for (let i = 0; i < days; i++) {
        const date = startOfDay(addDays(monthStart, i));
        if (date > now) break;
        if (date.getDay() === 0) continue; // skip Sundays
        const amount = 2000 + Math.floor(Math.random() * 4000);
        await prisma.salesRecord.create({
          data: { userId: user.id, date, amount },
        });
      }

      // Bonus activities
      await prisma.bonusActivity.createMany({
        data: [
          { userId: user.id, type: "Instagram", description: "Пост про нову колекцію", link: "https://instagram.com/p/example", amount: 150, status: "APPROVED" },
          { userId: user.id, type: "Facebook", description: "Репост акції", link: "https://facebook.com/example", amount: 150, status: "APPROVED" },
          { userId: user.id, type: "OLX", description: "Оголошення", link: "https://olx.ua/example", amount: 150, status: "PENDING" },
        ],
      });
    }
  }

  // ── Catalog ────────────────────────────────────────────────────────
  const products = [
    { name: "Куртка зимова", category: "Верхній одяг", article: "00412", price: 2800, color: "Чорний", size: "XL", gender: "Жіночий" },
    { name: "Светр в'язаний", category: "Трикотаж", article: "00389", price: 1200, color: "Бежевий", size: "M", gender: "Жіночий" },
    { name: "Штани карго", category: "Брюки", article: "00501", price: 1650, color: "Хакі", size: "L", gender: "Чоловічий" },
    { name: "Пуховик короткий", category: "Верхній одяг", article: "00477", price: 3100, color: "Синій", size: "S", gender: "Жіночий" },
    { name: "Футболка базова", category: "Трикотаж", article: "00312", price: 450, color: "Білий", size: "M", gender: "Чоловічий" },
    { name: "Джинси slim", category: "Брюки", article: "00298", price: 1900, color: "Синій", size: "30-32", gender: "Чоловічий" },
  ];
  for (const p of products) {
    await prisma.product.create({
      data: { ...p, description: `${p.name} — ${p.category}` },
    });
  }

  console.log("✅ Seed complete.");
  console.log("   Admin:  admin@company.com / password");
  console.log("   Seller: olena@company.com / password (онбординг пройдено)");
  console.log("   Seller: kateryna@company.com / password (онбординг не почато)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
