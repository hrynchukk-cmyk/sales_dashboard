"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tag } from "@/components/ui";

type Seller = {
  id: string;
  name: string;
  email: string;
  earningPercent: number;
  weeklyPlan: number;
  monthlyPlan: number;
  status: "ACTIVE" | "BLOCKED";
  inviteCode: string | null;
  telegramId: string | null;
};
type Stats = { monthSales: number; monthPct: number; earnings: number; bonuses: number };
type Activity = {
  id: string;
  type: string;
  description: string;
  link: string | null;
  amount: number;
  status: string;
  createdAt: string;
};

function uah(n: number) {
  return "₴" + Math.round(n).toLocaleString("uk-UA");
}

export default function SellerProfile({
  seller,
  stats,
  activities,
  botUsername,
}: {
  seller: Seller;
  stats: Stats;
  activities: Activity[];
  botUsername: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(seller);
  const [savedMsg, setSavedMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const inviteLink =
    seller.inviteCode && botUsername
      ? `https://t.me/${botUsername}?start=${seller.inviteCode}`
      : null;

  async function regenInvite() {
    await patch({ regenerateInvite: true }, "Код оновлено");
  }
  async function unlinkTelegram() {
    if (!confirm("Відвʼязати Telegram-акаунт продавця?")) return;
    await patch({ unlinkTelegram: true }, "Telegram відвʼязано");
  }
  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function patch(data: Record<string, unknown>, msg: string) {
    const res = await fetch(`/api/sellers/${seller.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSavedMsg(msg);
      setTimeout(() => setSavedMsg(""), 2000);
      router.refresh();
    }
  }

  async function toggleBlock() {
    const next = form.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    setForm({ ...form, status: next });
    await patch({ status: next }, next === "BLOCKED" ? "Заблоковано" : "Розблоковано");
  }

  async function remove() {
    if (!confirm(`Видалити продавця ${seller.name}? Дію не можна скасувати.`)) return;
    await fetch(`/api/sellers/${seller.id}`, { method: "DELETE" });
    router.push("/admin/sellers");
    router.refresh();
  }

  async function moderate(id: string, status: "APPROVED" | "REJECTED") {
    await fetch(`/api/bonus/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/sellers" className="text-[11px] text-[#bbb] hover:text-[#777]">
          ← Продавці /
        </Link>
        <span className="text-[12px] font-medium">{seller.name}</span>
        {form.status === "BLOCKED" && <Tag tone="danger">Заблокована</Tag>}
        <div className="flex-1" />
        {savedMsg && <span className="text-[11px] text-[#2E7D32]">✓ {savedMsg}</span>}
        <button className="btn text-[11px]" onClick={toggleBlock}>
          {form.status === "ACTIVE" ? "Заблокувати" : "Розблокувати"}
        </button>
        <button className="btn-danger text-[11px]" onClick={remove}>
          Видалити
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Info */}
        <div className="card p-4">
          <div className="text-[11px] font-medium mb-3">Інформація</div>
          <div className="flex flex-col gap-2.5 text-[11px]">
            <div>
              <label className="label">Ім&apos;я</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email (логін)</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">% заробітку</label>
              <input
                className="input w-[100px]"
                type="number"
                value={form.earningPercent}
                onChange={(e) => setForm({ ...form, earningPercent: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Скинути пароль (необов&apos;язково)</label>
              <input
                className="input"
                placeholder="Новий пароль..."
                onChange={(e) => setForm({ ...form, ...{ password: e.target.value } as object })}
              />
            </div>
          </div>
          <button
            className="btn w-full mt-3 text-[11px]"
            onClick={() =>
              patch(
                {
                  name: form.name,
                  email: form.email,
                  earningPercent: form.earningPercent,
                  ...(("password" in form && (form as Record<string, unknown>).password)
                    ? { password: (form as Record<string, unknown>).password as string }
                    : {}),
                } as Partial<Seller>,
                "Збережено"
              )
            }
          >
            Зберегти зміни
          </button>
        </div>

        {/* Plan */}
        <div className="card p-4">
          <div className="text-[11px] font-medium mb-3">Виставити план продажів</div>
          <div className="flex flex-col gap-2.5 text-[11px]">
            <div>
              <label className="label">Тижневий план (₴)</label>
              <input
                className="input"
                type="number"
                value={form.weeklyPlan}
                onChange={(e) => setForm({ ...form, weeklyPlan: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Місячний план (₴)</label>
              <input
                className="input"
                type="number"
                value={form.monthlyPlan}
                onChange={(e) => setForm({ ...form, monthlyPlan: Number(e.target.value) })}
              />
            </div>
          </div>
          <button
            className="btn-primary w-full mt-3 text-[11px]"
            onClick={() => patch({ weeklyPlan: form.weeklyPlan, monthlyPlan: form.monthlyPlan }, "План збережено")}
          >
            Зберегти план
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="card p-4">
        <div className="text-[11px] font-medium mb-3">Статистика за поточний місяць</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="metric">
            <div className="m-label">Продажі</div>
            <div className="m-val">{uah(stats.monthSales)}</div>
          </div>
          <div className="metric">
            <div className="m-label">Виконання</div>
            <div className="m-val">{stats.monthPct}%</div>
          </div>
          <div className="metric">
            <div className="m-label">Заробіток</div>
            <div className="m-val">{uah(stats.earnings)}</div>
          </div>
          <div className="metric">
            <div className="m-label">Бонуси</div>
            <div className="m-val">{uah(stats.bonuses)}</div>
          </div>
        </div>
      </div>

      {/* Telegram (Variant 2) */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <i className="ti ti-brand-telegram text-[#1565C0]" />
          <div className="text-[11px] font-medium flex-1">Telegram бот</div>
          {seller.telegramId ? (
            <Tag tone="green">Привʼязано</Tag>
          ) : (
            <Tag tone="warn">Не привʼязано</Tag>
          )}
        </div>

        {seller.telegramId ? (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#888]">Telegram ID: {seller.telegramId}</span>
            <button className="btn-danger text-[11px]" onClick={unlinkTelegram}>
              Відвʼязати
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-[11px] text-[#888]">
              Надішліть продавцю посилання — за ним бот привʼяже його акаунт і запустить онбординг.
            </div>
            {inviteLink ? (
              <div className="flex items-center gap-2">
                <input className="input text-[11px]" value={inviteLink} readOnly />
                <button className="btn text-[11px]" onClick={copyLink}>
                  {copied ? "✓" : "Копіювати"}
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-[#C62828]">
                Вкажіть <code>TELEGRAM_BOT_USERNAME</code> у .env, щоб згенерувати посилання.
                {seller.inviteCode && <> Інвайт-код: <b>{seller.inviteCode}</b></>}
              </div>
            )}
            <button className="btn text-[11px] self-start" onClick={regenInvite}>
              <i className="ti ti-refresh" /> Згенерувати новий код
            </button>
          </div>
        )}
      </div>

      {/* Bonus moderation */}
      <div className="card px-4">
        <div className="text-[11px] font-medium py-3">Бонусні активності</div>
        {activities.length === 0 && (
          <div className="text-[11px] text-[#bbb] pb-3">Немає активностей</div>
        )}
        {activities.map((a) => (
          <div
            key={a.id}
            className="grid items-center gap-2 py-2 border-t border-[#F5F5F5]"
            style={{ gridTemplateColumns: "80px 1fr 60px 140px" }}
          >
            <span className="tag border border-[#D8D8D8] bg-[#F8F8F8] text-[#666]">{a.type}</span>
            <span className="text-[11px] truncate">
              {a.link ? (
                <a href={a.link} target="_blank" className="text-[#1565C0] hover:underline">
                  {a.description || a.link}
                </a>
              ) : (
                a.description || "—"
              )}
            </span>
            <span className="text-[11px] font-medium">{uah(a.amount)}</span>
            {a.status === "PENDING" ? (
              <div className="flex gap-1.5">
                <button className="btn text-[10px] py-1" onClick={() => moderate(a.id, "APPROVED")}>
                  ✓ Нарахувати
                </button>
                <button className="btn-danger text-[10px] py-1" onClick={() => moderate(a.id, "REJECTED")}>
                  ✕
                </button>
              </div>
            ) : a.status === "APPROVED" ? (
              <Tag tone="green">Нараховано</Tag>
            ) : (
              <Tag tone="danger">Відхилено</Tag>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
