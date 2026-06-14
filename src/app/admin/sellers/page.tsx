import Link from "next/link";
import { adminPage } from "@/lib/page";
import { prisma } from "@/lib/db";
import { getSellerStats, getOnboardingStatus } from "@/lib/stats";
import { uahShort } from "@/lib/format";
import { Tag } from "@/components/ui";
import AddSeller from "./AddSeller";

export default async function SellersListPage() {
  await adminPage();
  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    orderBy: { createdAt: "asc" },
  });

  const rows = await Promise.all(
    sellers.map(async (s) => ({
      seller: s,
      stats: await getSellerStats(s.id),
      onboarding: await getOnboardingStatus(s.id),
    }))
  );

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="text-[14px] font-medium flex-1">Продавці</div>
        <AddSeller />
      </div>

      <div className="card px-4">
        <div
          className="grid text-[10px] text-[#aaa] uppercase tracking-wide py-2 border-b border-line"
          style={{ gridTemplateColumns: "2fr 1fr 1.1fr 1fr 1fr 60px" }}
        >
          <span>Продавець</span>
          <span>Онбординг</span>
          <span>Тижн. план</span>
          <span>Факт (міс)</span>
          <span>Заробіток</span>
          <span>Дії</span>
        </div>
        {rows.length === 0 && (
          <div className="text-[12px] text-[#bbb] py-6 text-center">Ще немає продавців</div>
        )}
        {rows.map(({ seller, stats, onboarding }) => (
          <div
            key={seller.id}
            className="grid items-center py-2.5 border-b border-[#F5F5F5]"
            style={{ gridTemplateColumns: "2fr 1fr 1.1fr 1fr 1fr 60px" }}
          >
            <div>
              <div className="font-medium text-[12px]">{seller.name}</div>
              <div className="text-[10px] text-[#bbb]">{seller.email}</div>
            </div>
            <span>
              <Tag tone={onboarding.tone}>{onboarding.label}</Tag>
            </span>
            <span className="text-[12px]">{uahShort(seller.weeklyPlan)}</span>
            <span className="text-[12px]">{uahShort(stats.monthSales)}</span>
            <span className="text-[12px]">{uahShort(stats.total)}</span>
            <Link href={`/admin/sellers/${seller.id}`} className="text-[#999] hover:text-[#111]" title="Профіль">
              <i className="ti ti-chevron-right text-[16px]" />
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
