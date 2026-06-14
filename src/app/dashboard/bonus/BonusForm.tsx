"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Upload from "@/components/Upload";

const TYPES = ["Instagram", "Facebook", "TikTok", "OLX", "Сайт", "Інше"];

export default function BonusForm({ bonusAmount }: { bonusAmount: number }) {
  const router = useRouter();
  const [type, setType] = useState(TYPES[0]);
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [screenshotUrl, setScreenshot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, description, link, screenshotUrl }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Помилка");
      return;
    }
    setDescription("");
    setLink("");
    setScreenshot(null);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-4 flex flex-col gap-2.5">
      <div className="text-[12px] font-medium">Нова активність</div>
      <div>
        <label className="label">Тип активності</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Опис</label>
        <input
          className="input"
          placeholder="Напр. Пост про нову колекцію"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Посилання</label>
        <input
          className="input"
          placeholder="https://instagram.com/p/..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Скріншот (необов&apos;язково)</label>
        <Upload value={screenshotUrl} onChange={setScreenshot} label="Завантажити скріншот" />
      </div>
      <div className="flex items-center justify-between text-[11px] px-2.5 py-2 bg-[#F8F8F8] rounded-md border border-[#EFEFEF]">
        <span className="text-[#888]">Бонус за одну активність:</span>
        <span className="font-medium">₴{bonusAmount}</span>
      </div>
      {error && <div className="text-[11px] text-[#C62828]">{error}</div>}
      <button className="btn-primary" disabled={saving}>
        {saving ? "Надсилання..." : "Надіслати на перевірку"}
      </button>
    </form>
  );
}
