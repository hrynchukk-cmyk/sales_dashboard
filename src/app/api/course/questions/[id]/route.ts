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
    const question = await prisma.testQuestion.update({
      where: { id },
      data: {
        text: b.text,
        options: b.options != null ? JSON.stringify(b.options) : undefined,
        correctIndex: b.correctIndex != null ? Number(b.correctIndex) : undefined,
      },
    });
    return NextResponse.json({ ok: true, question });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handler(async () => {
    await requireAdmin();
    const { id } = await params;
    await prisma.testQuestion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
