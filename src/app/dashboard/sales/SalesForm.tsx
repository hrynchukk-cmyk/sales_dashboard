"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SalesForm({
  today,
  todayIso,
  initialAmount,
  initialComment,
}: {
  today: string;
  todayIso: string;
  initialAmount: number | null;
  initialComment: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(initialAmount?.toString() ?? "");
  const [comment, setComment] = useState(initialComment);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ week: number; month: number } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), comment, date: todayIso }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMsg({ week: data.stats.weekPct, month: data.stats.monthPct });
      router.refresh();
    }
  }

  const already = initialAmount != null;

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <div
        className="px-3 py-2.5 rounded-md border text-[11px]"
        style={{
          background: already ? "#E8F5E9" : "#FFF8E1",
          borderColor: already ? "#C8E6C9" : "#FFE082",
          color: already ? "#2E7D32" : "#F57F17",
        }}
      >
        Сьогодні: <b>{today}</b> ·{" "}
        {already ? "Запис внесено (можна оновити)" : "Запис ще не внесено"}
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <div>
          <label className="label">Дата</label>
          <input className="input bg-[#F0F0F0]" value={today} disabled />
        </div>
        <div>
          <label className="label">Сума продажів за день (₴)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            placeholder="Введіть суму..."
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div>
          <label className="label">Коментар (необов&apos;язково)</label>
          <textarea
            className="input min-h-[56px]"
            placeholder="Деталі щодо продажів..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="h-px bg-[#F0F0F0]" />
        <button className="btn-primary w-full" disabled={saving}>
          {saving ? "Збереження..." : "Зберегти запис"}
        </button>
      </div>

      {msg && (
        <div className="card p-4">
          <div className="text-[11px] font-medium mb-2">Оновлено:</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="metric">
              <div className="m-label">Тижневий %</div>
              <div className="m-val" style={{ fontSize: 16 }}>{msg.week}%</div>
            </div>
            <div className="metric">
              <div className="m-label">Місячний %</div>
              <div className="m-val" style={{ fontSize: 16 }}>{msg.month}%</div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
