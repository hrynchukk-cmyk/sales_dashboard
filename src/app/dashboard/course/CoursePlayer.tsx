"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Question = { id: string; text: string; options: string[] };
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
type Progress = { moduleId: string; completed: boolean; bestScore: number };

export default function CoursePlayer({
  modules,
  progress,
  onboardingDone,
}: {
  modules: Module[];
  progress: Progress[];
  onboardingDone: boolean;
}) {
  const router = useRouter();
  const doneSet = new Set(progress.filter((p) => p.completed).map((p) => p.moduleId));

  // First not-completed module is the current one.
  const firstIncomplete = modules.findIndex((m) => !doneSet.has(m.id));
  const [activeIdx, setActiveIdx] = useState(firstIncomplete === -1 ? 0 : firstIncomplete);
  const [mode, setMode] = useState<"content" | "test" | "result">("content");
  const [answers, setAnswers] = useState<number[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [result, setResult] = useState<{ score: number; passed: boolean; passScore: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const active = modules[activeIdx];
  const completedCount = modules.filter((m) => doneSet.has(m.id)).length;

  function isUnlocked(idx: number) {
    if (idx === 0) return true;
    return doneSet.has(modules[idx - 1].id) || doneSet.has(modules[idx].id);
  }

  function openModule(idx: number) {
    if (!isUnlocked(idx)) return;
    setActiveIdx(idx);
    setMode("content");
    setResult(null);
    setQIdx(0);
    setAnswers([]);
  }

  function startTest() {
    setAnswers(new Array(active.questions.length).fill(-1));
    setQIdx(0);
    setMode("test");
  }

  async function submitTest() {
    setSubmitting(true);
    const res = await fetch("/api/course/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId: active.id, answers }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setResult({ score: data.score, passed: data.passed, passScore: data.passScore });
      setMode("result");
      if (data.passed) router.refresh();
      if (data.onboardingDone) {
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1800);
      }
    }
  }

  // ── Onboarding complete banner ──────────────────────────────────────
  if (onboardingDone && completedCount === modules.length) {
    return (
      <div className="card p-8 text-center flex flex-col items-center gap-3 max-w-[460px] mx-auto">
        <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32] text-2xl">
          <i className="ti ti-check" />
        </div>
        <div className="text-[15px] font-semibold">Онбординг завершено!</div>
        <div className="text-[12px] text-[#888]">
          Ви успішно пройшли всі модулі курсу. Усі розділи системи розблоковано.
        </div>
        <button className="btn-primary" onClick={() => router.push("/dashboard")}>
          Перейти до дашборду
        </button>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="card p-8 text-center text-[12px] text-[#888]">
        Курс ще не налаштовано. Зверніться до адміністратора.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden flex flex-col md:flex-row min-h-[520px]">
      {/* Module sidebar */}
      <div className="w-full md:w-[210px] border-b md:border-b-0 md:border-r border-line py-3 flex-shrink-0">
        <div className="text-[10px] text-[#bbb] px-4 pb-2 uppercase tracking-wide">
          Модулі курсу
        </div>
        {modules.map((m, idx) => {
          const done = doneSet.has(m.id);
          const unlocked = isUnlocked(idx);
          const isActive = idx === activeIdx;
          return (
            <button
              key={m.id}
              onClick={() => openModule(idx)}
              disabled={!unlocked}
              className={`w-full text-left px-4 py-2 text-[11px] flex items-center gap-2 ${
                isActive ? "bg-[#F5F5F5] font-medium border-l-2 border-[#333]" : ""
              } ${done ? "text-[#2E7D32]" : unlocked ? "text-[#333]" : "text-[#bbb]"}`}
            >
              <i
                className={`ti text-[13px] ${
                  done ? "ti-check" : unlocked ? (isActive ? "ti-player-play" : "ti-circle") : "ti-lock"
                }`}
              />
              {m.order}. {m.title}
            </button>
          );
        })}
        <div className="px-4 pt-3 mt-2 border-t border-[#F0F0F0]">
          <div className="text-[10px] text-[#bbb] mb-1.5">Загальний прогрес</div>
          <div className="progress" style={{ height: 6 }}>
            <div
              className="progress-fill"
              style={{ width: `${(completedCount / modules.length) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-[#888] mt-1">
            {completedCount} з {modules.length} модулів
          </div>
        </div>
      </div>

      {/* Content / Test */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {mode === "content" && <ModuleContent module={active} onTest={startTest} />}
        {mode === "test" && (
          <TestView
            module={active}
            qIdx={qIdx}
            answers={answers}
            setAnswers={setAnswers}
            setQIdx={setQIdx}
            onSubmit={submitTest}
            submitting={submitting}
          />
        )}
        {mode === "result" && result && (
          <ResultView
            result={result}
            onRetry={() => {
              setMode("content");
              setResult(null);
            }}
            onContinue={() => openModule(Math.min(activeIdx + 1, modules.length - 1))}
            hasNext={activeIdx < modules.length - 1}
          />
        )}
      </div>
    </div>
  );
}

function ModuleContent({ module, onTest }: { module: Module; onTest: () => void }) {
  return (
    <>
      <div className="text-[14px] font-medium">
        Модуль {module.order}: {module.title}
      </div>
      {module.videoUrl ? (
        <video src={module.videoUrl} controls className="w-full rounded-lg max-h-[260px] bg-black" />
      ) : (
        <div className="h-[150px] rounded-lg border border-dashed border-[#C8C8C8] flex items-center justify-center text-[#aaa] text-[11px] gap-2">
          <i className="ti ti-player-play text-[24px]" /> Відео не додано
        </div>
      )}
      {module.textContent && (
        <div className="card p-4 text-[12px] text-[#666] leading-relaxed whitespace-pre-wrap">
          {module.textContent}
        </div>
      )}
      {module.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {module.photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`Фото ${i + 1}`} className="rounded-md w-full object-cover max-h-[160px]" />
          ))}
        </div>
      )}
      <div className="flex justify-end mt-1">
        <button className="btn-primary" onClick={onTest} disabled={module.questions.length === 0}>
          {module.questions.length === 0 ? "Немає тесту" : "Далі → Тест по модулю"}
        </button>
      </div>
    </>
  );
}

function TestView({
  module,
  qIdx,
  answers,
  setAnswers,
  setQIdx,
  onSubmit,
  submitting,
}: {
  module: Module;
  qIdx: number;
  answers: number[];
  setAnswers: (a: number[]) => void;
  setQIdx: (i: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const q = module.questions[qIdx];
  const total = module.questions.length;
  const letters = ["А", "Б", "В", "Г", "Д", "Е"];
  const last = qIdx === total - 1;
  const answered = answers.filter((a) => a >= 0).length;

  function choose(i: number) {
    const next = [...answers];
    next[qIdx] = i;
    setAnswers(next);
  }

  return (
    <div className="max-w-[580px] w-full mx-auto flex flex-col gap-3.5">
      <div>
        <div className="flex gap-1 mb-2.5">
          {module.questions.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded"
              style={{ background: i <= qIdx ? "#333" : "#E0E0E0" }}
            />
          ))}
        </div>
        <div className="text-[10px] text-[#bbb]">
          Прохідний бал: {module.passScore}% · Питання {qIdx + 1} / {total}
        </div>
      </div>

      <div className="card p-4">
        <div className="text-[13px] font-medium mb-4 leading-relaxed">{q.text}</div>
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const selected = answers[qIdx] === i;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left border ${
                  selected ? "border-2 border-[#333] bg-[#F8F8F8]" : "border border-line bg-white"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] flex-shrink-0 ${
                    selected ? "border-[#333] font-semibold bg-white" : "border-[#D8D8D8]"
                  }`}
                >
                  {letters[i]}
                </span>
                <span className={`text-[12px] ${selected ? "text-[#111] font-medium" : "text-[#666]"}`}>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button className="btn" disabled={qIdx === 0} onClick={() => setQIdx(qIdx - 1)}>
          ← Попереднє
        </button>
        {last ? (
          <button className="btn-primary" onClick={onSubmit} disabled={submitting || answered < total}>
            {submitting ? "Перевірка..." : "Завершити тест"}
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setQIdx(qIdx + 1)} disabled={answers[qIdx] < 0}>
            Наступне →
          </button>
        )}
      </div>

      <div className="px-3 py-2.5 bg-[#FFF8E1] rounded-lg border border-[#FFE082] text-[11px] text-[#F57F17]">
        ⚠ Якщо результат буде нижче {module.passScore}% — необхідно пройти модуль повторно
      </div>
    </div>
  );
}

function ResultView({
  result,
  onRetry,
  onContinue,
  hasNext,
}: {
  result: { score: number; passed: boolean; passScore: number };
  onRetry: () => void;
  onContinue: () => void;
  hasNext: boolean;
}) {
  return (
    <div className="max-w-[420px] w-full mx-auto flex flex-col items-center gap-3 py-8 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
        style={{
          background: result.passed ? "#E8F5E9" : "#FFEBEE",
          color: result.passed ? "#2E7D32" : "#C62828",
        }}
      >
        <i className={`ti ${result.passed ? "ti-check" : "ti-x"}`} />
      </div>
      <div className="text-[18px] font-semibold">{result.score}%</div>
      <div className="text-[13px] font-medium">
        {result.passed ? "Модуль пройдено!" : "Тест не складено"}
      </div>
      <div className="text-[12px] text-[#888]">
        {result.passed
          ? "Ви успішно склали тест по цьому модулю."
          : `Потрібно мінімум ${result.passScore}%. Перегляньте матеріал і спробуйте ще раз.`}
      </div>
      {result.passed ? (
        hasNext ? (
          <button className="btn-primary" onClick={onContinue}>
            Наступний модуль →
          </button>
        ) : null
      ) : (
        <button className="btn-primary" onClick={onRetry}>
          Пройти модуль повторно
        </button>
      )}
    </div>
  );
}
