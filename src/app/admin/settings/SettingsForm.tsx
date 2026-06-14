"use client";

import { useState } from "react";

export default function SettingsForm({
  initial,
}: {
  initial: { bonusPerActivity: number; companyName: string };
}) {
  const [form, setForm] = useState(initial);
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setSavedMsg("Налаштування збережено");
      setTimeout(() => setSavedMsg(""), 2500);
    }
  }

  return (
    <div className="max-w-[440px] flex flex-col gap-3">
      <div className="text-[14px] font-medium">Налаштування</div>

      <div className="card p-4 flex flex-col gap-3">
        <div className="text-[12px] font-medium">Бонусна система</div>
        <div>
          <label className="label">Сума бонусу за одну активність (₴)</label>
          <input
            className="input"
            type="number"
            value={form.bonusPerActivity}
            onChange={(e) => setForm({ ...form, bonusPerActivity: Number(e.target.value) })}
          />
          <div className="text-[10px] text-[#bbb] mt-1">
            Застосовується до нових активностей, що надсилаються продавцями.
          </div>
        </div>
        <div className="h-px bg-[#F0F0F0]" />
        <div className="text-[12px] font-medium">Загальне</div>
        <div>
          <label className="label">Назва компанії</label>
          <input
            className="input"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
        </div>
        {savedMsg && <div className="text-[11px] text-[#2E7D32]">✓ {savedMsg}</div>}
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Збереження..." : "Зберегти налаштування"}
        </button>
      </div>
    </div>
  );
}
