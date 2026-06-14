import { sellerPageLocked } from "@/lib/page";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth } from "@/lib/dates";
import { uah } from "@/lib/format";
import { Tag } from "@/components/ui";
import BonusForm from "./BonusForm";

function statusTag(status: string) {
  if (status === "APPROVED") return <Tag tone="green">Нараховано</Tag>;
  if (status === "REJECTED") return <Tag tone="danger">Відхилено</Tag>;
  return <Tag tone="warn">На перевірці</Tag>;
}

export default async function BonusPage() {
  const user = await sellerPageLocked();

  const [settings, activities, monthApproved] = await Promise.all([
    prisma.settings.findFirst(),
    prisma.bonusActivity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bonusActivity.aggregate({
      where: {
        userId: user.id,
        status: "APPROVED",
        createdAt: { gte: startOfMonth(new Date()), lt: endOfMonth(new Date()) },
      },
      _sum: { amount: true },
    }),
  ]);

  return (
    <div className="max-w-[520px] flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="text-[14px] font-medium flex-1">Бонусна активність</div>
        <div className="metric" style={{ padding: "6px 12px" }}>
          <div className="m-label">Бонуси цього місяця</div>
          <div className="m-val" style={{ fontSize: 16 }}>
            {uah(monthApproved._sum.amount ?? 0)}
          </div>
        </div>
      </div>

      <BonusForm bonusAmount={settings?.bonusPerActivity ?? 150} />

      <div className="card px-4">
        <div className="text-[11px] font-medium py-2.5">Попередні активності</div>
        {activities.length === 0 && (
          <div className="text-[11px] text-[#bbb] pb-3">Ще немає активностей</div>
        )}
        {activities.map((a) => (
          <div
            key={a.id}
            className="grid items-center gap-2 py-2 border-t border-[#F5F5F5]"
            style={{ gridTemplateColumns: "84px 1fr 60px 96px" }}
          >
            <span className="tag border border-[#D8D8D8] bg-[#F8F8F8] text-[#666]">
              {a.type}
            </span>
            <span className="text-[11px] truncate">
              {a.link ? (
                <a href={a.link} target="_blank" className="text-[#1565C0] hover:underline">
                  {a.description || a.link}
                </a>
              ) : (
                a.description || "—"
              )}
            </span>
            <span className="text-[11px] font-medium">{uah(a.amount)}</span>
            {statusTag(a.status)}
          </div>
        ))}
      </div>
    </div>
  );
}
