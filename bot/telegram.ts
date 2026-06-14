import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Context } from "telegraf";

/** Downloads a Telegram photo into public/uploads and returns its public path. */
export async function saveTelegramPhoto(ctx: Context, fileId: string): Promise<string | null> {
  try {
    const link = await ctx.telegram.getFileLink(fileId);
    const res = await fetch(link.href);
    const buf = Buffer.from(await res.arrayBuffer());
    const filename = `${randomUUID()}.jpg`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buf);
    return `/uploads/${filename}`;
  } catch (e) {
    console.error("photo save failed", e);
    return null;
  }
}

export function uah(n: number): string {
  return "₴" + Math.round(n).toLocaleString("uk-UA");
}
