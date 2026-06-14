import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createToken,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Вкажіть логін і пароль" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim() },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Невірний логін або пароль" }, { status: 401 });
  }
  if (user.status === "BLOCKED") {
    return NextResponse.json({ error: "Акаунт заблоковано" }, { status: 403 });
  }

  const token = await createToken({ uid: user.id, role: user.role, name: user.name });
  await setSessionCookie(token);

  // Sellers who haven't finished onboarding land on the course.
  const redirect =
    user.role === "ADMIN"
      ? "/admin"
      : user.onboardingDone
        ? "/dashboard"
        : "/dashboard/course";

  return NextResponse.json({ ok: true, redirect });
}
