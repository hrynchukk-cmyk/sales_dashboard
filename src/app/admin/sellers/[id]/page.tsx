import { notFound } from "next/navigation";
import { adminPage } from "@/lib/page";
import { prisma } from "@/lib/db";
import { getSellerStats } from "@/lib/stats";
import SellerProfile from "./SellerProfile";

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await adminPage();
  const { id } = await params;

  const seller = await prisma.user.findUnique({ where: { id } });
  if (!seller || seller.role !== "SELLER") notFound();

  const [stats, activities] = await Promise.all([
    getSellerStats(id),
    prisma.bonusActivity.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <SellerProfile
      botUsername={process.env.TELEGRAM_BOT_USERNAME ?? ""}
      seller={{
        id: seller.id,
        name: seller.name,
        email: seller.email,
        earningPercent: seller.earningPercent,
        weeklyPlan: seller.weeklyPlan,
        monthlyPlan: seller.monthlyPlan,
        status: seller.status,
        inviteCode: seller.inviteCode,
        telegramId: seller.telegramId,
      }}
      stats={{
        monthSales: stats.monthSales,
        monthPct: stats.monthPct,
        earnings: stats.earnings,
        bonuses: stats.bonuses,
      }}
      activities={activities.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        link: a.link,
        amount: a.amount,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
