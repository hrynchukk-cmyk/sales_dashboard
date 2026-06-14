import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

/** Guard for route handlers: returns the user or throws a NextResponse. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw NextResponse.json({ error: "Доступ заборонено" }, { status: 403 });
  }
  return user;
}

/** Wraps a handler so thrown NextResponses become the response. */
export function handler<T>(fn: () => Promise<T>) {
  return fn().catch((e) => {
    if (e instanceof NextResponse) return e;
    console.error(e);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  });
}
