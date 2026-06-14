import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireAdmin } from "@/lib/api";
import { buildReport, resolvePeriod, ReportRow } from "@/lib/reports";
import { isoDate } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "excel";
  const period = searchParams.get("period") || "month";
  const sellerId = searchParams.get("sellerId") || "all";
  const input = resolvePeriod(period, searchParams.get("from"), searchParams.get("to"));
  const rows = await buildReport({ ...input, sellerId });

  const periodLabel = `${isoDate(input.from)} — ${isoDate(new Date(input.to.getTime() - 1))}`;

  if (format === "pdf") {
    const bytes = await buildPdf(rows, periodLabel);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report_${period}.pdf"`,
      },
    });
  }

  const buffer = await buildExcel(rows, periodLabel);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report_${period}.xlsx"`,
    },
  });
}

async function buildExcel(rows: ReportRow[], periodLabel: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Звіт");

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = `Звіт по продажах · ${periodLabel}`;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.addRow([]);

  const header = ws.addRow([
    "Продавець",
    "Email",
    "Продажі (₴)",
    "План (₴)",
    "% виконання",
    "Бонуси (₴)",
    "Заробіток разом (₴)",
  ]);
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
  });

  rows.forEach((r) => {
    ws.addRow([
      r.name,
      r.email,
      Math.round(r.sales),
      Math.round(r.plan),
      `${r.planPct}%`,
      Math.round(r.bonuses),
      Math.round(r.total),
    ]);
  });

  ws.addRow([]);
  const totalRow = ws.addRow([
    "РАЗОМ",
    "",
    Math.round(rows.reduce((a, b) => a + b.sales, 0)),
    Math.round(rows.reduce((a, b) => a + b.plan, 0)),
    "",
    Math.round(rows.reduce((a, b) => a + b.bonuses, 0)),
    Math.round(rows.reduce((a, b) => a + b.total, 0)),
  ]);
  totalRow.font = { bold: true };

  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      max = Math.max(max, String(cell.value ?? "").length + 2);
    });
    col.width = max;
  });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

async function buildPdf(rows: ReportRow[], periodLabel: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 40;
  let y = 800;

  const draw = (text: string, x: number, size = 10, f = font, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(text, { x, y, size, font: f, color });
  };

  draw("Sales report", margin, 16, bold);
  y -= 20;
  draw(`Period: ${periodLabel}`, margin, 10, font, rgb(0.4, 0.4, 0.4));
  y -= 24;

  // Column x positions (Latin headers — core fonts lack Cyrillic glyphs).
  const cols = [margin, 170, 270, 350, 430, 510];
  const headers = ["Seller", "Sales", "Plan", "%", "Bonus", "Total"];
  headers.forEach((h, i) => draw(h, cols[i], 9, bold, rgb(0.5, 0.5, 0.5)));
  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: 555, y },
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 14;

  const ascii = (s: string) => s.replace(/[^\x00-\x7F]/g, "?");
  for (const r of rows) {
    if (y < 60) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
    draw(ascii(r.name), cols[0], 10);
    draw(String(Math.round(r.sales)), cols[1], 10);
    draw(String(Math.round(r.plan)), cols[2], 10);
    draw(`${r.planPct}%`, cols[3], 10);
    draw(String(Math.round(r.bonuses)), cols[4], 10);
    draw(String(Math.round(r.total)), cols[5], 10);
    y -= 18;
  }

  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: 555, y },
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 16;
  draw("TOTAL", cols[0], 10, bold);
  draw(String(Math.round(rows.reduce((a, b) => a + b.sales, 0))), cols[1], 10, bold);
  draw(String(Math.round(rows.reduce((a, b) => a + b.plan, 0))), cols[2], 10, bold);
  draw(String(Math.round(rows.reduce((a, b) => a + b.bonuses, 0))), cols[4], 10, bold);
  draw(String(Math.round(rows.reduce((a, b) => a + b.total, 0))), cols[5], 10, bold);

  return doc.save();
}
