import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, handler } from "@/lib/api";

export async function POST(req: NextRequest) {
  return handler(async () => {
    await requireAdmin();
    const b = await req.json().catch(() => ({}));
    const count = await prisma.courseModule.count();
    const module = await prisma.courseModule.create({
      data: {
        order: count + 1,
        title: b.title || `Модуль ${count + 1}`,
        textContent: b.textContent || "",
        videoUrl: b.videoUrl || null,
        photos: JSON.stringify(b.photos || []),
        passScore: Number(b.passScore) || 80,
      },
    });
    return NextResponse.json({ ok: true, module });
  });
}
