import { sellerPageLocked } from "@/lib/page";
import { prisma } from "@/lib/db";
import { startOfDay, formatDateUk, isoDate, formatWeekdayDate } from "@/lib/dates";
import { uah } from "@/lib/format";
import { Tag } from "@/components/ui";
import SalesForm from "./SalesForm";

export default async function SalesEntryPage() {
  const user = await sellerPageLocked();
  const today = startOfDay(new Date());

  const [todayRec, recent] = await Promise.all([
    prisma.salesRecord.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    }),
    prisma.salesRecord.findMany({
      where: { userId: user.id, date: { lt: today } },
      orderBy: { date: "desc" },
      take: 7,
    }),
  ]);

  return (
    <div className="max-w-[480px] flex flex-col gap-3">
      <div className="text-[14px] font-medium">Внести продажі</div>

      <SalesForm
        today={formatDateUk(today)}
        todayIso={isoDate(today)}
        initialAmount={todayRec?.amount ?? null}
        initialComment={todayRec?.comment ?? ""}
      />

      <div className="card px-4">
        <div className="text-[11px] font-medium py-2.5">Попередні записи</div>
        {recent.length === 0 && (
          <div className="text-[11px] text-[#bbb] pb-3">Ще немає записів</div>
        )}
        {recent.map((r) => (
          <div
            key={r.id}
            className="grid items-center py-2 border-t border-[#F5F5F5] text-[11px]"
            style={{ gridTemplateColumns: "110px 1fr 80px" }}
          >
            <span>{formatWeekdayDate(r.date)}</span>
            <span className="font-medium">{uah(r.amount)}</span>
            <Tag tone="green">Внесено</Tag>
          </div>
        ))}
      </div>
    </div>
  );
}
