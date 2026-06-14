import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin, handler } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handler(async () => {
    await requireUser();
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: b.name,
        description: b.description,
        article: b.article,
        photoUrl: b.photoUrl,
        price: b.price != null ? Number(b.price) : undefined,
        color: b.color,
        size: b.size,
        gender: b.gender,
        category: b.category,
      },
    });
    return NextResponse.json({ ok: true, product });
  });
}

// Only admin can delete from the catalog (per SoW 2.5).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handler(async () => {
    await requireAdmin();
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
