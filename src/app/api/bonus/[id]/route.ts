import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, handler } from "@/lib/api";

// Admin approves / rejects a bonus activity.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handler(async () => {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body.status;
    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Невірний статус" }, { status: 400 });
    }
    const activity = await prisma.bonusActivity.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json({ ok: true, activity });
  });
}
