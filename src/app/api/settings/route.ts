import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, handler } from "@/lib/api";

export async function GET() {
  return handler(async () => {
    await requireAdmin();
    const settings =
      (await prisma.settings.findFirst()) ??
      (await prisma.settings.create({ data: { id: 1 } }));
    return NextResponse.json({ settings });
  });
}

export async function PATCH(req: NextRequest) {
  return handler(async () => {
    await requireAdmin();
    const b = await req.json().catch(() => ({}));
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        bonusPerActivity: Number(b.bonusPerActivity) || 150,
        companyName: b.companyName || "Sales Platform",
      },
      update: {
        bonusPerActivity:
          b.bonusPerActivity != null ? Number(b.bonusPerActivity) : undefined,
        companyName: b.companyName ?? undefined,
      },
    });
    return NextResponse.json({ ok: true, settings });
  });
}
