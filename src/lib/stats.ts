import { prisma } from "./db";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "./dates";

export type SellerStats = {
  weekSales: number;
  monthSales: number;
  weeklyPlan: number;
  monthlyPlan: number;
  weekPct: number;
  monthPct: number;
  earnings: number; // % of month sales
  bonuses: number; // approved bonuses this month
  total: number; // earnings + bonuses
};

function sum(arr: { amount: number }[]): number {
  return arr.reduce((a, b) => a + b.amount, 0);
}

/** Computes the live stats for one seller for the period containing `ref`. */
export async function getSellerStats(
  userId: string,
  ref: Date = new Date()
): Promise<SellerStats> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("user not found");

  const wkStart = startOfWeek(ref);
  const wkEnd = endOfWeek(ref);
  const moStart = startOfMonth(ref);
  const moEnd = endOfMonth(ref);

  const [weekRecords, monthRecords, approvedBonuses] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { userId, date: { gte: wkStart, lt: wkEnd } },
    }),
    prisma.salesRecord.findMany({
      where: { userId, date: { gte: moStart, lt: moEnd } },
    }),
    prisma.bonusActivity.findMany({
      where: {
        userId,
        status: "APPROVED",
        createdAt: { gte: moStart, lt: moEnd },
      },
    }),
  ]);

  const weekSales = sum(weekRecords);
  const monthSales = sum(monthRecords);
  const bonuses = sum(approvedBonuses);
  const earnings = (monthSales * user.earningPercent) / 100;

  return {
    weekSales,
    monthSales,
    weeklyPlan: user.weeklyPlan,
    monthlyPlan: user.monthlyPlan,
    weekPct: user.weeklyPlan ? Math.round((weekSales / user.weeklyPlan) * 100) : 0,
    monthPct: user.monthlyPlan ? Math.round((monthSales / user.monthlyPlan) * 100) : 0,
    earnings,
    bonuses,
    total: earnings + bonuses,
  };
}

export type OnboardingStatus = {
  label: string;
  tone: "green" | "warn" | "danger";
  avgScore: number | null;
};

/** Summarises a seller's onboarding state for admin lists. */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const [modules, progress, user] = await Promise.all([
    prisma.courseModule.findMany({ orderBy: { order: "asc" } }),
    prisma.moduleProgress.findMany({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const total = modules.length;
  const completed = progress.filter((p) => p.completed).length;
  const scores = progress.filter((p) => p.completed).map((p) => p.bestScore);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  if (user?.onboardingDone || (total > 0 && completed >= total)) {
    return { label: `✓ ${avgScore ?? 100}%`, tone: "green", avgScore };
  }
  if (completed === 0) {
    return { label: "Не почав", tone: "danger", avgScore: null };
  }
  return { label: `Етап ${completed + 1}`, tone: "warn", avgScore };
}
