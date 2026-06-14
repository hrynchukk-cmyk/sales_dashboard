import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, handler } from "@/lib/api";

// Seller submits test answers for a module.
// Grades, stores attempt, updates progress, unlocks system when all modules pass.
export async function POST(req: NextRequest) {
  return handler(async () => {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const moduleId: string = b.moduleId;
    const answers: number[] = Array.isArray(b.answers) ? b.answers : [];

    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!module) {
      return NextResponse.json({ error: "Модуль не знайдено" }, { status: 404 });
    }

    const total = module.questions.length;
    let correct = 0;
    module.questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    const score = total ? Math.round((correct / total) * 100) : 100;
    const passed = score >= module.passScore;

    await prisma.testAttempt.create({
      data: { userId: user.id, moduleId, score, passed },
    });

    const existing = await prisma.moduleProgress.findUnique({
      where: { userId_moduleId: { userId: user.id, moduleId } },
    });
    await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId } },
      create: {
        userId: user.id,
        moduleId,
        completed: passed,
        bestScore: score,
      },
      update: {
        completed: passed || existing?.completed || false,
        bestScore: Math.max(score, existing?.bestScore ?? 0),
      },
    });

    // If every module is now completed, unlock the rest of the system.
    let onboardingDone = user.onboardingDone;
    if (passed) {
      const modules = await prisma.courseModule.findMany({ select: { id: true } });
      const progress = await prisma.moduleProgress.findMany({
        where: { userId: user.id, completed: true },
        select: { moduleId: true },
      });
      const doneIds = new Set(progress.map((p) => p.moduleId));
      const all = modules.length > 0 && modules.every((m) => doneIds.has(m.id));
      if (all && !user.onboardingDone) {
        await prisma.user.update({
          where: { id: user.id },
          data: { onboardingDone: true },
        });
        onboardingDone = true;
      }
    }

    return NextResponse.json({
      ok: true,
      score,
      passed,
      passScore: module.passScore,
      onboardingDone,
    });
  });
}
