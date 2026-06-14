import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, handler } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

// Edit seller: profile, %, plans, status, password (per SoW 2.1 / 2.3).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handler(async () => {
    await requireAdmin();
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (b.name != null) data.name = String(b.name);
    if (b.email != null) data.email = String(b.email).toLowerCase().trim();
    if (b.earningPercent != null) data.earningPercent = Number(b.earningPercent);
    if (b.weeklyPlan != null) data.weeklyPlan = Number(b.weeklyPlan);
    if (b.monthlyPlan != null) data.monthlyPlan = Number(b.monthlyPlan);
    if (b.status != null) data.status = b.status;
    if (b.onboardingDone != null) data.onboardingDone = Boolean(b.onboardingDone);
    if (b.password) data.passwordHash = await hashPassword(String(b.password));

    const user = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ ok: true, id: user.id });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handler(async () => {
    await requireAdmin();
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
