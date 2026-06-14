"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Помилка входу");
      return;
    }
    router.push(data.redirect);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[340px]">
        <form onSubmit={submit} className="card p-5 flex flex-col gap-3.5">
          <div className="text-center pt-2 pb-1">
            <div className="w-[72px] h-[28px] mx-auto mb-3.5 rounded bg-[#111] text-white text-[11px] font-semibold flex items-center justify-center">
              SALES
            </div>
            <div className="text-[16px] font-semibold text-[#111]">Вхід у систему</div>
            <div className="text-[11px] text-[#aaa] mt-1">
              Внутрішня платформа продажів
            </div>
          </div>
          <div className="h-px bg-[#F0F0F0]" />
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="label">Логін</label>
              <input
                className="input"
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="label">Пароль</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          {error && (
            <div className="text-[11px] text-[#C62828] bg-[#FFEBEE] rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Вхід..." : "Увійти"}
          </button>
          <div className="text-[10px] text-[#bbb] text-center">
            Забули пароль? Зверніться до адміністратора
          </div>
        </form>
        <div className="mt-2.5 text-[10px] text-center px-3 py-2 bg-[#FFFDE7] rounded-md border border-[#FFF176] text-[#F57F17]">
          ⚠ При першому вході буде запущено обов&apos;язковий онбординг курс
        </div>
      </div>
    </div>
  );
}
