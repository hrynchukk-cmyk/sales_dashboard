import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireUser, handler } from "@/lib/api";

// Local file storage. In production swap for an S3-compatible client (per SoW).
export async function POST(req: NextRequest) {
  return handler(async () => {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Файл не надано" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filename = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
    return NextResponse.json({ url: `/uploads/${filename}` });
  });
}
