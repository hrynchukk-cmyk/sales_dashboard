import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, handler } from "@/lib/api";

export async function GET(req: NextRequest) {
  return handler(async () => {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category")?.trim();
    const products = await prisma.product.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { name: { contains: q } },
                  { article: { contains: q } },
                ],
              }
            : {},
          category && category !== "Всі" ? { category } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ products });
  });
}

// Both sellers and admin can add products (per SoW 2.5).
export async function POST(req: NextRequest) {
  return handler(async () => {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    if (!b.name) {
      return NextResponse.json({ error: "Вкажіть назву товару" }, { status: 400 });
    }
    const product = await prisma.product.create({
      data: {
        name: String(b.name),
        description: b.description || "",
        article: b.article || "",
        photoUrl: b.photoUrl || null,
        price: Number(b.price) || 0,
        color: b.color || "",
        size: b.size || "",
        gender: b.gender || "",
        category: b.category || "",
        createdById: user.id,
      },
    });
    return NextResponse.json({ ok: true, product });
  });
}
