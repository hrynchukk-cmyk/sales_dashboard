"use client";

import { useState } from "react";

export default function Upload({
  value,
  onChange,
  label = "Завантажити файл",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (res.ok) onChange(data.url);
  }

  if (value) {
    return (
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="w-14 h-14 rounded-md object-cover border border-line" />
        <button type="button" className="btn" onClick={() => onChange(null)}>
          <i className="ti ti-x" /> Прибрати
        </button>
      </div>
    );
  }

  return (
    <label className="border border-dashed border-[#C8C8C8] rounded-md h-16 flex items-center justify-center gap-2 text-[11px] text-[#aaa] cursor-pointer hover:bg-[#FAFAFA]">
      <i className="ti ti-upload text-[18px]" />
      {busy ? "Завантаження..." : label}
      <input type="file" className="hidden" onChange={pick} accept="image/*" />
    </label>
  );
}
