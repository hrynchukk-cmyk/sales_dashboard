import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, handler } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  return handler(async () => {
    await requireAdmin();
    const sellers = await prisma.user.findMany({
      where: { role: "SELLER" },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ sellers });
  });
}

// Admin manually creates a seller account (per SoW 2.1).
export async function POST(req: NextRequest) {
  return handler(async () => {
    await requireAdmin();
    const b = await req.json().catch(() => ({}));
    const email = String(b.email || "").toLowerCase().trim();
    if (!b.name || !email || !b.password) {
      return NextResponse.json(
        { error: "Вкажіть ім'я, логін і пароль" },
        { status: 400 }
      );
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Такий логін вже існує" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        name: String(b.name),
        email,
        passwordHash: await hashPassword(String(b.password)),
        role: "SELLER",
        earningPercent: Number(b.earningPercent) || 10,
        weeklyPlan: Number(b.weeklyPlan) || 0,
        monthlyPlan: Number(b.monthlyPlan) || 0,
      },
    });
    return NextResponse.json({ ok: true, id: user.id });
  });
}
