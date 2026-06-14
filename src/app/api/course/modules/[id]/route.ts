import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, handler } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handler(async () => {
    await requireAdmin();
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const module = await prisma.courseModule.update({
      where: { id },
      data: {
        title: b.title,
        textContent: b.textContent,
        videoUrl: b.videoUrl,
        photos: b.photos != null ? JSON.stringify(b.photos) : undefined,
        passScore: b.passScore != null ? Number(b.passScore) : undefined,
      },
    });
    return NextResponse.json({ ok: true, module });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handler(async () => {
    await requireAdmin();
    const { id } = await params;
    await prisma.courseModule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
