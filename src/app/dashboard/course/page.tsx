import { sellerPage } from "@/lib/page";
import { prisma } from "@/lib/db";
import CoursePlayer from "./CoursePlayer";

export default async function CoursePage() {
  // NOTE: not locked — this is the page sellers are funneled to until done.
  const user = await sellerPage();

  const [modules, progress] = await Promise.all([
    prisma.courseModule.findMany({
      orderBy: { order: "asc" },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.moduleProgress.findMany({ where: { userId: user.id } }),
  ]);

  const safeModules = modules.map((m) => ({
    id: m.id,
    order: m.order,
    title: m.title,
    textContent: m.textContent,
    videoUrl: m.videoUrl,
    photos: JSON.parse(m.photos || "[]") as string[],
    passScore: m.passScore,
    // Strip correct answers before sending to the client.
    questions: m.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options || "[]") as string[],
    })),
  }));

  return (
    <>
      {!user.onboardingDone && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[14px] font-medium flex-1">Онбординг курс</div>
          <span className="tag tag-warn">⚠ Решта розділів заблоковано до завершення</span>
        </div>
      )}
      {user.onboardingDone && <div className="text-[14px] font-medium">Онбординг курс</div>}
      <CoursePlayer
        modules={safeModules}
        progress={progress.map((p) => ({
          moduleId: p.moduleId,
          completed: p.completed,
          bestScore: p.bestScore,
        }))}
        onboardingDone={user.onboardingDone}
      />
    </>
  );
}
