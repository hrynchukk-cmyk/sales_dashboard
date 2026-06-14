import { sellerPageLocked } from "@/lib/page";
import { prisma } from "@/lib/db";
import { getSellerStats } from "@/lib/stats";
import { startOfWeek, endOfWeek, addDays, formatWeekdayDate, startOfDay } from "@/lib/dates";
import { uah, uahShort } from "@/lib/format";
import { Metric, Progress, Tag } from "@/components/ui";

export default async function SellerDashboard() {
  const user = await sellerPageLocked();
  const stats = await getSellerStats(user.id);

  const wkStart = startOfWeek(new Date());
  const records = await prisma.salesRecord.findMany({
    where: { userId: user.id, date: { gte: wkStart, lt: endOfWeek(new Date()) } },
  });
  const byDay = new Map(records.map((r) => [startOfDay(r.date).getTime(), r]));
  const today = startOfDay(new Date()).getTime();

  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(wkStart, i);
    const rec = byDay.get(d.getTime());
    return { date: d, rec, isFuture: d.getTime() > today };
  });

  return (
    <>
      <div className="text-[14px] font-medium">Мій дашборд</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Продажі (міс)" value={uahShort(stats.monthSales)} sub={`план: ${uahShort(stats.monthlyPlan)}`} />
        <Metric label="Виконання" value={`${stats.monthPct}%`} sub="місячний план" />
        <Metric label="Заробіток" value={uahShort(stats.earnings)} sub={`+ ${uahShort(stats.bonuses)} бонуси`} />
        <Metric label="Разом" value={uahShort(stats.total)} sub="за цей місяць" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="card p-4">
          <div className="text-[11px] font-medium mb-2">Місячний план</div>
          <div className="flex justify-between text-[11px] mb-1.5 text-[#888]">
            <span>Факт: {uah(stats.monthSales)}</span>
            <span>{stats.monthPct}%</span>
          </div>
          <Progress value={stats.monthPct} />
          <div className="text-[10px] text-[#bbb] mt-1">
            Залишилось: {uah(Math.max(0, stats.monthlyPlan - stats.monthSales))} до плану
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-medium mb-2">Тижневий план</div>
          <div className="flex justify-between text-[11px] mb-1.5 text-[#888]">
            <span>Факт: {uah(stats.weekSales)}</span>
            <span>{stats.weekPct}%</span>
          </div>
          <Progress value={stats.weekPct} />
          <div className="text-[10px] text-[#bbb] mt-1">
            Залишилось: {uah(Math.max(0, stats.weeklyPlan - stats.weekSales))} до плану
          </div>
        </div>
      </div>

      <div className="card px-4">
        <div className="text-[11px] font-medium py-2.5">Записи продажів — цей тиждень</div>
        {week.map(({ date, rec, isFuture }) => (
          <div
            key={date.getTime()}
            className="grid items-center py-2 border-t border-[#F5F5F5]"
            style={{ gridTemplateColumns: "100px 1fr 90px" }}
          >
            <span className="text-[11px] text-[#888]">{formatWeekdayDate(date)}</span>
            <span className="text-[11px] font-medium">
              {rec ? uah(rec.amount) : <span className="text-[#bbb]">—</span>}
            </span>
            <span>
              {rec ? (
                <Tag tone="green">Внесено</Tag>
              ) : isFuture ? (
                <span className="text-[10px] text-[#ccc]">—</span>
              ) : (
                <Tag tone="warn">Не внесено</Tag>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
