import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, handler } from "@/lib/api";

export async function POST(req: NextRequest) {
  return handler(async () => {
    await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (!b.moduleId || !b.text) {
      return NextResponse.json({ error: "Невірні дані" }, { status: 400 });
    }
    const count = await prisma.testQuestion.count({ where: { moduleId: b.moduleId } });
    const question = await prisma.testQuestion.create({
      data: {
        moduleId: b.moduleId,
        order: count,
        text: String(b.text),
        options: JSON.stringify(b.options || ["", ""]),
        correctIndex: Number(b.correctIndex) || 0,
      },
    });
    return NextResponse.json({ ok: true, question });
  });
}
