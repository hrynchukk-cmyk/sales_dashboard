import { adminPage } from "@/lib/page";
import { prisma } from "@/lib/db";
import CourseManager from "./CourseManager";

export default async function AdminCoursePage() {
  await adminPage();
  const modules = await prisma.courseModule.findMany({
    orderBy: { order: "asc" },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  return (
    <CourseManager
      modules={modules.map((m) => ({
        id: m.id,
        order: m.order,
        title: m.title,
        textContent: m.textContent,
        videoUrl: m.videoUrl,
        photos: JSON.parse(m.photos || "[]") as string[],
        passScore: m.passScore,
        questions: m.questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: JSON.parse(q.options || "[]") as string[],
          correctIndex: q.correctIndex,
        })),
      }))}
    />
  );
}
