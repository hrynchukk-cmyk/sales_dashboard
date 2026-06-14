"use client";

import { useEffect, useState, useCallback } from "react";
import Upload from "./Upload";
import { uah } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  description: string;
  article: string;
  photoUrl: string | null;
  price: number;
  color: string;
  size: string;
  gender: string;
  category: string;
};

const empty: Omit<Product, "id"> = {
  name: "",
  description: "",
  article: "",
  photoUrl: null,
  price: 0,
  color: "",
  size: "",
  gender: "",
  category: "",
};

export default function Catalog({ canDelete }: { canDelete: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("Всі");
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category !== "Всі") params.set("category", category);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products ?? []);
    setLoading(false);
  }, [q, category]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const categories = ["Всі", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  async function save() {
    if (!editing) return;
    const isNew = !editing.id;
    const url = isNew ? "/api/products" : `/api/products/${editing.id}`;
    await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Видалити товар?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-[14px] font-medium flex-1">Каталог товарів</div>
        <input
          className="input w-[150px]"
          placeholder="🔍 Пошук..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input w-[140px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button className="btn" onClick={() => setEditing({ ...empty })}>
          <i className="ti ti-plus" /> Додати товар
        </button>
      </div>

      {loading ? (
        <div className="text-[12px] text-[#bbb] py-8 text-center">Завантаження...</div>
      ) : products.length === 0 ? (
        <div className="text-[12px] text-[#bbb] py-8 text-center">Товарів не знайдено</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {products.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              <div className="h-20 bg-[#F0F0F0] border-b border-line flex items-center justify-center text-[11px] text-[#aaa]">
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  p.name
                )}
              </div>
              <div className="p-2.5">
                <div className="text-[11px] font-medium">{p.name}</div>
                <div className="text-[10px] text-[#bbb] my-0.5">
                  {p.category || "—"} · Арт: {p.article || "—"}
                </div>
                <div className="text-[10px] text-[#888] mb-1.5">
                  {[p.color, p.size, p.gender].filter(Boolean).join(" / ") || "—"}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-medium">{uah(p.price)}</span>
                  <div className="flex gap-2 text-[14px] text-[#aaa]">
                    <button onClick={() => setEditing(p)} title="Редагувати">
                      <i className="ti ti-edit hover:text-[#111]" />
                    </button>
                    {canDelete && (
                      <button onClick={() => remove(p.id)} title="Видалити">
                        <i className="ti ti-trash hover:text-[#C62828]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? "Редагувати товар" : "Новий товар"} onClose={() => setEditing(null)} onSave={save}>
          <Field label="Назва">
            <input className="input" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </Field>
          <Field label="Опис">
            <textarea className="input min-h-[48px]" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Артикул">
              <input className="input" value={editing.article ?? ""} onChange={(e) => setEditing({ ...editing, article: e.target.value })} />
            </Field>
            <Field label="Ціна (₴)">
              <input className="input" type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            </Field>
            <Field label="Колір">
              <input className="input" value={editing.color ?? ""} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
            </Field>
            <Field label="Розмір">
              <input className="input" value={editing.size ?? ""} onChange={(e) => setEditing({ ...editing, size: e.target.value })} />
            </Field>
            <Field label="Стать">
              <select className="input" value={editing.gender ?? ""} onChange={(e) => setEditing({ ...editing, gender: e.target.value })}>
                <option value="">—</option>
                <option>Жіночий</option>
                <option>Чоловічий</option>
                <option>Унісекс</option>
              </select>
            </Field>
            <Field label="Категорія">
              <input className="input" value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </Field>
          </div>
          <Field label="Фото">
            <Upload value={editing.photoUrl ?? null} onChange={(url) => setEditing({ ...editing, photoUrl: url })} label="Завантажити фото" />
          </Field>
        </Modal>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  onSave,
  saveLabel = "Зберегти",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-[460px] max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-line sticky top-0 bg-white">
          <div className="text-[13px] font-semibold">{title}</div>
          <button onClick={onClose} className="text-[#999] hover:text-[#111]">
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-2.5">{children}</div>
        <div className="flex gap-2 px-4 py-3 border-t border-line sticky bottom-0 bg-white">
          <button className="btn flex-1" onClick={onClose}>Скасувати</button>
          <button className="btn-primary flex-1" onClick={onSave}>{saveLabel}</button>
        </div>
      </div>
    </div>
  );
}
