import React from "react";

export function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="metric">
      <div className="m-label">{label}</div>
      <div className="m-val">{value}</div>
      {sub != null && <div className="m-sub">{sub}</div>}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" style={{ height: 8 }}>
      <div className="progress-fill" style={{ width: `${w}%` }} />
    </div>
  );
}

type Tone = "green" | "warn" | "danger" | "blue";
export function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function PageTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-[14px] font-medium flex-1">{children}</div>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-[#bbb] text-center py-8">{children}</div>
  );
}
