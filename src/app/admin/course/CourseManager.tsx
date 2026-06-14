"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Upload from "@/components/Upload";

type Question = { id: string; text: string; options: string[]; correctIndex: number };
type Module = {
  id: string;
  order: number;
  title: string;
  textContent: string;
  videoUrl: string | null;
  photos: string[];
  passScore: number;
  questions: Question[];
};

export default function CourseManager({ modules }: { modules: Module[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(modules[0]?.id ?? null);
  const active = modules.find((m) => m.id === activeId) ?? null;

  async function addModule() {
    const res = await fetch("/api/course/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Модуль ${modules.length + 1}` }),
    });
    const data = await res.json();
    if (res.ok) {
      setActiveId(data.module.id);
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="text-[14px] font-medium flex-1">Управління курсом</div>
        <button className="btn" onClick={addModule}>
          <i className="ti ti-plus" /> Додати модуль
        </button>
      </div>

      <div className="card overflow-hidden flex flex-col md:flex-row min-h-[480px]">
        <div className="w-full md:w-[200px] border-b md:border-b-0 md:border-r border-line py-3 flex-shrink-0">
          <div className="text-[10px] text-[#bbb] px-4 pb-2 uppercase tracking-wide">Модулі</div>
          {modules.length === 0 && (
            <div className="text-[11px] text-[#bbb] px-4 py-2">Ще немає модулів</div>
          )}
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={`w-full text-left px-4 py-2 text-[11px] flex items-center gap-2 ${
                m.id === activeId ? "bg-[#F5F5F5] font-medium border-l-2 border-[#333]" : "text-[#777]"
              }`}
            >
              <i className="ti ti-book text-[13px] opacity-60" />
              {m.order}. {m.title}
            </button>
          ))}
        </div>

        <div className="flex-1 p-4">
          {active ? (
            <ModuleEditor key={active.id} module={active} />
          ) : (
            <div className="text-[12px] text-[#bbb] text-center py-10">
              Створіть перший модуль курсу
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ModuleEditor({ module }: { module: Module }) {
  const router = useRouter();
  const [m, setM] = useState(module);
  const [savedMsg, setSavedMsg] = useState("");

  async function saveModule() {
    const res = await fetch(`/api/course/modules/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: m.title,
        textContent: m.textContent,
        videoUrl: m.videoUrl,
        photos: m.photos,
        passScore: m.passScore,
      }),
    });
    if (res.ok) {
      setSavedMsg("Збережено");
      setTimeout(() => setSavedMsg(""), 2000);
      router.refresh();
    }
  }

  async function deleteModule() {
    if (!confirm("Видалити модуль разом з питаннями?")) return;
    await fetch(`/api/course/modules/${m.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function addQuestion() {
    const res = await fetch("/api/course/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: m.id,
        text: "Нове питання",
        options: ["Варіант 1", "Варіант 2"],
        correctIndex: 0,
      }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="text-[13px] font-medium flex-1">Редагування модуля</div>
        {savedMsg && <span className="text-[11px] text-[#2E7D32]">✓ {savedMsg}</span>}
        <button className="btn-danger text-[11px]" onClick={deleteModule}>
          Видалити модуль
        </button>
      </div>

      <div>
        <label className="label">Назва модуля</label>
        <input className="input" value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} />
      </div>
      <div>
        <label className="label">Текстовий контент</label>
        <textarea
          className="input min-h-[100px]"
          value={m.textContent}
          onChange={(e) => setM({ ...m, textContent: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Прохідний бал (%)</label>
          <input
            className="input"
            type="number"
            value={m.passScore}
            onChange={(e) => setM({ ...m, passScore: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Відео (URL або завантажити)</label>
          <input
            className="input mb-1.5"
            placeholder="https://..."
            value={m.videoUrl ?? ""}
            onChange={(e) => setM({ ...m, videoUrl: e.target.value })}
          />
          <Upload value={null} onChange={(url) => setM({ ...m, videoUrl: url })} label="Завантажити відео" />
        </div>
      </div>
      <div>
        <label className="label">Фото модуля</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {m.photos.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-16 h-16 rounded-md object-cover border border-line" />
              <button
                className="absolute -top-1.5 -right-1.5 bg-white border border-line rounded-full w-5 h-5 text-[10px] text-[#C62828]"
                onClick={() => setM({ ...m, photos: m.photos.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <Upload value={null} onChange={(url) => url && setM({ ...m, photos: [...m.photos, url] })} label="Додати фото" />
      </div>

      <button className="btn-primary text-[12px]" onClick={saveModule}>
        Зберегти модуль
      </button>

      <div className="h-px bg-[#F0F0F0] my-1" />

      <div className="flex items-center gap-2">
        <div className="text-[12px] font-medium flex-1">Питання тесту ({m.questions.length})</div>
        <button className="btn text-[11px]" onClick={addQuestion}>
          <i className="ti ti-plus" /> Додати питання
        </button>
      </div>
      {m.questions.length === 0 && (
        <div className="text-[11px] text-[#bbb]">Додайте питання для тесту по модулю</div>
      )}
      {m.questions.map((q, i) => (
        <QuestionEditor key={q.id} question={q} index={i} />
      ))}
    </div>
  );
}

function QuestionEditor({ question, index }: { question: Question; index: number }) {
  const router = useRouter();
  const [q, setQ] = useState(question);

  async function save() {
    await fetch(`/api/course/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: q.text, options: q.options, correctIndex: q.correctIndex }),
    });
    router.refresh();
  }

  async function remove() {
    if (!confirm("Видалити питання?")) return;
    await fetch(`/api/course/questions/${q.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="border border-line rounded-md p-3 flex flex-col gap-2 bg-[#FAFAFA]">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#bbb]">Питання {index + 1}</span>
        <div className="flex-1" />
        <button className="text-[#C62828] text-[12px]" onClick={remove} title="Видалити">
          <i className="ti ti-trash" />
        </button>
      </div>
      <input
        className="input"
        value={q.text}
        onChange={(e) => setQ({ ...q, text: e.target.value })}
        placeholder="Текст питання"
      />
      <div className="flex flex-col gap-1.5">
        {q.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={q.correctIndex === i}
              onChange={() => setQ({ ...q, correctIndex: i })}
              title="Правильна відповідь"
            />
            <input
              className="input flex-1"
              value={opt}
              onChange={(e) =>
                setQ({ ...q, options: q.options.map((o, j) => (j === i ? e.target.value : o)) })
              }
            />
            {q.options.length > 2 && (
              <button
                className="text-[#C62828] text-[12px]"
                onClick={() => setQ({ ...q, options: q.options.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn text-[11px]" onClick={() => setQ({ ...q, options: [...q.options, ""] })}>
          + Варіант
        </button>
        <div className="flex-1" />
        <button className="btn-primary text-[11px]" onClick={save}>
          Зберегти питання
        </button>
      </div>
      <div className="text-[10px] text-[#bbb]">● — позначте правильну відповідь</div>
    </div>
  );
}
