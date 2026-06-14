"use client";

import { useEffect, useState, useCallback } from "react";

type Row = {
  sellerId: string;
  name: string;
  email: string;
  sales: number;
  plan: number;
  planPct: number;
  earned: number;
  bonuses: number;
  total: number;
};

type Seller = { id: string; name: string };

const PERIODS = [
  { key: "day", label: "День" },
  { key: "week", label: "Тиждень" },
  { key: "month", label: "Місяць" },
  { key: "custom", label: "Період" },
];

function uah(n: number) {
  return "₴" + Math.round(n).toLocaleString("uk-UA");
}

export default function ReportsView({ sellers }: { sellers: Seller[] }) {
  const [period, setPeriod] = useState("month");
  const [sellerId, setSellerId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ period, sellerId });
    if (period === "custom") {
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    }
    const res = await fetch(`/api/reports?${p}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setLoading(false);
  }, [period, sellerId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function exportUrl(format: "excel" | "pdf") {
    const p = new URLSearchParams({ period, sellerId, format });
    if (period === "custom") {
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    }
    return `/api/reports/export?${p}`;
  }

  const totals = rows.reduce(
    (a, r) => ({
      sales: a.sales + r.sales,
      bonuses: a.bonuses + r.bonuses,
      total: a.total + r.total,
    }),
    { sales: 0, bonuses: 0, total: 0 }
  );

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-[14px] font-medium flex-1">Звіти</div>
        <a className="btn" href={exportUrl("excel")}>
          <i className="ti ti-file-spreadsheet" /> Excel
        </a>
        <a className="btn" href={exportUrl("pdf")}>
          <i className="ti ti-file-text" /> PDF
        </a>
      </div>

      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`btn text-[11px] ${period === p.key ? "!bg-[#111] !text-white !border-[#111]" : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select className="input w-[180px]" value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
          <option value="all">Усі продавці</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {period === "custom" && (
          <>
            <input className="input w-[140px]" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input className="input w-[140px]" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        )}
      </div>

      <div className="card px-4">
        <div
          className="grid text-[10px] text-[#aaa] uppercase tracking-wide py-2 border-b border-line"
          style={{ gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr 1fr 1.1fr" }}
        >
          <span>Продавець</span>
          <span>Продажі</span>
          <span>План</span>
          <span>%</span>
          <span>Бонуси</span>
          <span>Заробіток разом</span>
        </div>
        {loading ? (
          <div className="text-[12px] text-[#bbb] py-6 text-center">Завантаження...</div>
        ) : rows.length === 0 ? (
          <div className="text-[12px] text-[#bbb] py-6 text-center">Немає даних за період</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.sellerId}
              className="grid items-center py-2.5 border-b border-[#F5F5F5] text-[12px]"
              style={{ gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr 1fr 1.1fr" }}
            >
              <span className="font-medium">{r.name}</span>
              <span>{uah(r.sales)}</span>
              <span>{r.plan ? uah(r.plan) : "—"}</span>
              <span>{r.plan ? `${r.planPct}%` : "—"}</span>
              <span>{uah(r.bonuses)}</span>
              <span className="font-medium">{uah(r.total)}</span>
            </div>
          ))
        )}
        {rows.length > 0 && (
          <div
            className="grid items-center py-2.5 text-[12px] font-semibold"
            style={{ gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr 1fr 1.1fr" }}
          >
            <span>РАЗОМ</span>
            <span>{uah(totals.sales)}</span>
            <span>—</span>
            <span>—</span>
            <span>{uah(totals.bonuses)}</span>
            <span>{uah(totals.total)}</span>
          </div>
        )}
      </div>
    </>
  );
}
