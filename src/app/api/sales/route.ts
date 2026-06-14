import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, handler } from "@/lib/api";
import { startOfDay } from "@/lib/dates";
import { getSellerStats } from "@/lib/stats";

// List current user's recent sales records.
export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const records = await prisma.salesRecord.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 30,
    });
    return NextResponse.json({ records });
  });
}

// Create or update the daily sales record (one per day per seller).
export async function POST(req: NextRequest) {
  return handler(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Невірна сума" }, { status: 400 });
    }
    const date = startOfDay(body.date ? new Date(body.date) : new Date());

    await prisma.salesRecord.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date, amount, comment: body.comment || null },
      update: { amount, comment: body.comment || null },
    });

    const stats = await getSellerStats(user.id);
    return NextResponse.json({ ok: true, stats });
  });
}
