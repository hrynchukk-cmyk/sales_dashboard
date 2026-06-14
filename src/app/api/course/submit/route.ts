import { NextRequest, NextResponse } from "next/server";
import { requireUser, handler } from "@/lib/api";
import { gradeModule } from "@/lib/course";

// Seller submits test answers for a module (web client).
export async function POST(req: NextRequest) {
  return handler(async () => {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const answers: number[] = Array.isArray(b.answers) ? b.answers : [];
    const result = await gradeModule(user.id, b.moduleId, answers);
    if (!result) {
      return NextResponse.json({ error: "Модуль не знайдено" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  });
}
