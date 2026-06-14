import { prisma } from "./db";

export type GradeResult = {
  score: number;
  passed: boolean;
  passScore: number;
  onboardingDone: boolean;
};

/**
 * Grades a module test for a user, records the attempt and progress, and
 * unlocks the system once every module is completed.
 * Shared by the web API and the Telegram bot.
 */
export async function gradeModule(
  userId: string,
  moduleId: string,
  answers: number[]
): Promise<GradeResult | null> {
  const module = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!module) return null;

  const total = module.questions.length;
  let correct = 0;
  module.questions.forEach((q, i) => {
    if (answers[i] === q.correctIndex) correct++;
  });
  const score = total ? Math.round((correct / total) * 100) : 100;
  const passed = score >= module.passScore;

  await prisma.testAttempt.create({
    data: { userId, moduleId, score, passed },
  });

  const existing = await prisma.moduleProgress.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
  });
  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: { userId, moduleId, completed: passed, bestScore: score },
    update: {
      completed: passed || existing?.completed || false,
      bestScore: Math.max(score, existing?.bestScore ?? 0),
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  let onboardingDone = user?.onboardingDone ?? false;
  if (passed) {
    const modules = await prisma.courseModule.findMany({ select: { id: true } });
    const progress = await prisma.moduleProgress.findMany({
      where: { userId, completed: true },
      select: { moduleId: true },
    });
    const doneIds = new Set(progress.map((p) => p.moduleId));
    const all = modules.length > 0 && modules.every((m) => doneIds.has(m.id));
    if (all && !onboardingDone) {
      await prisma.user.update({ where: { id: userId }, data: { onboardingDone: true } });
      onboardingDone = true;
    }
  }

  return { score, passed, passScore: module.passScore, onboardingDone };
}

/** Returns the first not-yet-completed module for a user (or null if done). */
export async function nextModule(userId: string) {
  const modules = await prisma.courseModule.findMany({
    orderBy: { order: "asc" },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  const progress = await prisma.moduleProgress.findMany({
    where: { userId, completed: true },
    select: { moduleId: true },
  });
  const done = new Set(progress.map((p) => p.moduleId));
  return modules.find((m) => !done.has(m.id)) ?? null;
}

/** Generates a short, URL-safe invite code. */
export function makeInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
