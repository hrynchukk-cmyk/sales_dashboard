import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, handler } from "@/lib/api";

export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const activities = await prisma.bonusActivity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ activities });
  });
}

// Seller submits a marketing activity for review. Bonus amount is taken from settings.
export async function POST(req: NextRequest) {
  return handler(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    if (!body.type) {
      return NextResponse.json({ error: "Вкажіть тип активності" }, { status: 400 });
    }
    if (!body.link && !body.screenshotUrl) {
      return NextResponse.json(
        { error: "Додайте посилання або скріншот" },
        { status: 400 }
      );
    }
    const settings = await prisma.settings.findFirst();
    const amount = settings?.bonusPerActivity ?? 150;

    const activity = await prisma.bonusActivity.create({
      data: {
        userId: user.id,
        type: String(body.type),
        description: body.description || "",
        link: body.link || null,
        screenshotUrl: body.screenshotUrl || null,
        amount,
        status: "PENDING",
      },
    });
    return NextResponse.json({ ok: true, activity });
  });
}
