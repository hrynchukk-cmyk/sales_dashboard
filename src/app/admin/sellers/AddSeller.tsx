"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Catalog";

export default function AddSeller() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    earningPercent: 10,
    weeklyPlan: 0,
    monthlyPlan: 0,
  });
  const [error, setError] = useState("");

  async function save() {
    setError("");
    const res = await fetch("/api/sellers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Помилка");
      return;
    }
    setOpen(false);
    setForm({ name: "", email: "", password: "", earningPercent: 10, weeklyPlan: 0, monthlyPlan: 0 });
    router.refresh();
  }

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>
        <i className="ti ti-plus" /> Додати продавця
      </button>
      {open && (
        <Modal title="Новий продавець" onClose={() => setOpen(false)} onSave={save} saveLabel="Створити">
          <div>
            <label className="label">Ім&apos;я</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Логін (email)</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">% заробітку</label>
              <input className="input" type="number" value={form.earningPercent} onChange={(e) => setForm({ ...form, earningPercent: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Тижн. план</label>
              <input className="input" type="number" value={form.weeklyPlan} onChange={(e) => setForm({ ...form, weeklyPlan: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Міс. план</label>
              <input className="input" type="number" value={form.monthlyPlan} onChange={(e) => setForm({ ...form, monthlyPlan: Number(e.target.value) })} />
            </div>
          </div>
          {error && <div className="text-[11px] text-[#C62828]">{error}</div>}
          <div className="text-[10px] text-[#bbb]">
            Передайте логін і пароль новому працівнику. При першому вході запуститься онбординг курс.
          </div>
        </Modal>
      )}
    </>
  );
}
