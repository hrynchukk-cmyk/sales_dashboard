import { prisma } from "./db";

export type ReportRow = {
  sellerId: string;
  name: string;
  email: string;
  sales: number;
  plan: number;
  planPct: number;
  earned: number; // % of sales
  bonuses: number;
  total: number; // earned + bonuses
};

export type ReportInput = {
  sellerId?: string; // undefined / "all" → all sellers
  from: Date;
  to: Date; // exclusive
  period: "day" | "week" | "month" | "custom";
};

/** Builds report rows for one or all sellers over a date range. */
export async function buildReport(input: ReportInput): Promise<ReportRow[]> {
  const where =
    input.sellerId && input.sellerId !== "all"
      ? { id: input.sellerId }
      : { role: "SELLER" as const };

  const sellers = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
  });

  const rows: ReportRow[] = [];
  for (const s of sellers) {
    const [sales, bonuses] = await Promise.all([
      prisma.salesRecord.aggregate({
        where: { userId: s.id, date: { gte: input.from, lt: input.to } },
        _sum: { amount: true },
      }),
      prisma.bonusActivity.aggregate({
        where: {
          userId: s.id,
          status: "APPROVED",
          createdAt: { gte: input.from, lt: input.to },
        },
        _sum: { amount: true },
      }),
    ]);
    const salesSum = sales._sum.amount ?? 0;
    const bonusSum = bonuses._sum.amount ?? 0;
    const earned = (salesSum * s.earningPercent) / 100;
    // Compare against the relevant plan for the period.
    const plan =
      input.period === "week"
        ? s.weeklyPlan
        : input.period === "month"
          ? s.monthlyPlan
          : 0;
    rows.push({
      sellerId: s.id,
      name: s.name,
      email: s.email,
      sales: salesSum,
      plan,
      planPct: plan ? Math.round((salesSum / plan) * 100) : 0,
      earned,
      bonuses: bonusSum,
      total: earned + bonusSum,
    });
  }
  return rows;
}

export function resolvePeriod(
  period: string,
  fromStr?: string | null,
  toStr?: string | null
): ReportInput {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "day") {
    const to = new Date(start);
    to.setDate(to.getDate() + 1);
    return { from: start, to, period: "day" };
  }
  if (period === "week") {
    const day = (start.getDay() + 6) % 7;
    const from = new Date(start);
    from.setDate(from.getDate() - day);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    return { from, to, period: "week" };
  }
  if (period === "month") {
    const from = new Date(start.getFullYear(), start.getMonth(), 1);
    const to = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { from, to, period: "month" };
  }
  // custom
  const from = fromStr ? new Date(fromStr) : new Date(start.getFullYear(), 0, 1);
  const to = toStr ? new Date(toStr) : new Date(start.getFullYear() + 1, 0, 1);
  to.setHours(23, 59, 59, 999);
  return { from, to, period: "custom" };
}
