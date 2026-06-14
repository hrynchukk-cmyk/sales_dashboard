import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handler } from "@/lib/api";
import { buildReport, resolvePeriod } from "@/lib/reports";

// JSON report for the admin UI.
export async function GET(req: NextRequest) {
  return handler(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";
    const sellerId = searchParams.get("sellerId") || "all";
    const input = resolvePeriod(
      period,
      searchParams.get("from"),
      searchParams.get("to")
    );
    const rows = await buildReport({ ...input, sellerId });
    return NextResponse.json({ rows, from: input.from, to: input.to });
  });
}
