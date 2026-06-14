import { adminPage } from "@/lib/page";
import { prisma } from "@/lib/db";
import { getSellerStats, getOnboardingStatus } from "@/lib/stats";
import { startOfMonth, endOfMonth, monthShort } from "@/lib/dates";
import { uahShort } from "@/lib/format";
import { Metric, Progress, Tag } from "@/components/ui";

export default async function AdminDashboard() {
  await adminPage();
  const now = new Date();

  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    orderBy: { createdAt: "asc" },
  });

  // New sellers this month
  const monthStart = startOfMonth(now);
  const newThisMonth = sellers.filter((s) => s.createdAt >= monthStart).length;

  // Per-seller stats + onboarding
  const rows = await Promise.all(
    sellers.map(async (s) => ({
      seller: s,
      stats: await getSellerStats(s.id, now),
      onboarding: await getOnboardingStatus(s.id),
    }))
  );

  const onboardingDone = rows.filter((r) => r.seller.onboardingDone).length;
  const totalPlan = sellers.reduce((a, s) => a + s.monthlyPlan, 0);
  const totalFact = rows.reduce((a, r) => a + r.stats.monthSales, 0);
  const planPct = totalPlan ? Math.round((totalFact / totalPlan) * 100) : 0;

  // Last 7 months fact totals for the bar chart.
  const months: { label: string; value: number; current: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const agg = await prisma.salesRecord.aggregate({
      where: { date: { gte: startOfMonth(d), lt: endOfMonth(d) } },
      _sum: { amount: true },
    });
    months.push({
      label: monthShort(d.getMonth()),
      value: agg._sum.amount ?? 0,
      current: i === 0,
    });
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.value));

  return (
    <>
      <div className="text-[14px] font-medium">Загальна статистика</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Продавці" value={sellers.length} sub={`${newThisMonth} нових цього місяця`} />
        <Metric label="Онбординг" value={`${onboardingDone}/${sellers.length}`} sub="пройшли курс" />
        <Metric label="План (міс)" value={uahShort(totalPlan)} sub="загальний" />
        <Metric label="Факт (міс)" value={uahShort(totalFact)} sub={`${planPct}% виконання`} />
      </div>

      <div className="card p-4">
        <div className="text-[12px] font-medium mb-2">Факт продажів по місяцях</div>
        <div className="flex items-end gap-1.5 h-[80px]">
          {months.map((m, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${Math.max(4, (m.value / maxMonth) * 100)}%`,
                background: m.current ? "#333" : "#E0E0E0",
              }}
              title={uahShort(m.value)}
            />
          ))}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {months.map((m, i) => (
            <div
              key={i}
              className="flex-1 text-center text-[9px]"
              style={{ color: m.current ? "#333" : "#bbb", fontWeight: m.current ? 600 : 400 }}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      <div className="card px-4">
        <div className="text-[12px] font-medium py-3">Прогрес по продавцях</div>
        <div
          className="grid text-[10px] text-[#aaa] uppercase tracking-wide pb-1.5 border-b border-line"
          style={{ gridTemplateColumns: "2fr 1fr 1.3fr 1fr 1fr" }}
        >
          <span>Ім&apos;я</span>
          <span>Курс</span>
          <span>Виконання</span>
          <span>Факт</span>
          <span>Бонуси</span>
        </div>
        {rows.length === 0 && (
          <div className="text-[12px] text-[#bbb] py-6 text-center">Ще немає продавців</div>
        )}
        {rows.map(({ seller, stats, onboarding }) => (
          <div
            key={seller.id}
            className="grid items-center py-2 border-b border-[#F5F5F5] text-[12px]"
            style={{ gridTemplateColumns: "2fr 1fr 1.3fr 1fr 1fr" }}
          >
            <span className="font-medium">{seller.name}</span>
            <span>
              <Tag tone={onboarding.tone}>{onboarding.label}</Tag>
            </span>
            {seller.onboardingDone ? (
              <div className="flex items-center gap-1.5">
                <div className="w-[60px]">
                  <Progress value={stats.monthPct} />
                </div>
                <span>{stats.monthPct}%</span>
              </div>
            ) : (
              <span className="text-[#bbb]">—</span>
            )}
            <span>{seller.onboardingDone ? uahShort(stats.monthSales) : <span className="text-[#bbb]">—</span>}</span>
            <span>{seller.onboardingDone ? uahShort(stats.bonuses) : <span className="text-[#bbb]">—</span>}</span>
          </div>
        ))}
      </div>
    </>
  );
}
